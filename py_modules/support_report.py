"""Build a bounded, redacted DeckyZone support report.

The collector deliberately probes only a small allowlist of local files and
services. It never changes service state and never sends the report anywhere.
"""

from __future__ import annotations

import errno
import ipaddress
import os
import pwd
import re
import stat
import subprocess
from datetime import datetime, timezone
from pathlib import Path


MAX_REPORT_BYTES = 64 * 1024
MAX_LOG_TAIL_BYTES = 32 * 1024
MAX_PROBE_OUTPUT_CHARS = 4096
PROBE_TIMEOUT_SECONDS = 3
SAVED_REPORT_PREFIX = "DeckyZone-System-Report"
MAX_XDG_USER_DIRS_BYTES = 16 * 1024
REPORT_DIVIDER = "-" * 61

LOCKDOWN_PATH = "/sys/kernel/security/lockdown"
PORT_DEVICE_PATH = "/dev/port"
VPOWER_DIRECTORY = Path("/run/vpower")
VPOWER_FILES = (
    "secs_until_shutdown_request",
    "secs_until_battery_full",
    "battery_status",
)

VPOWER_SERVICE = "vpower.service"
VPOWER_PROPERTIES = (
    "LoadState",
    "ActiveState",
    "SubState",
    "UnitFileState",
    "FragmentPath",
    "Result",
    "ExecMainStatus",
)

UPOWER_SERVICE = "org.freedesktop.UPower"
UPOWER_DISPLAY_DEVICE_PATH = "/org/freedesktop/UPower/devices/DisplayDevice"
UPOWER_DEVICE_INTERFACE = "org.freedesktop.UPower.Device"
UPOWER_PROPERTIES = ("TimeToEmpty", "TimeToFull", "State")

_EMAIL_PATTERN = re.compile(
    r"(?<![\w.+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![\w.-])",
    re.IGNORECASE,
)
_IPV4_PATTERN = re.compile(r"(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])")
_MAC_PATTERN = re.compile(
    r"(?<![0-9A-F])(?:[0-9A-F]{2}[:-]){5}[0-9A-F]{2}(?![0-9A-F])",
    re.IGNORECASE,
)
_IPV6_CORE_PATTERN = (
    r"(?:[0-9A-F]{0,4}:){2,7}[0-9A-F:.]{0,15}"
    r"(?:%[0-9A-Z_.-]+)?"
)
_IPV6_CANDIDATE_PATTERN = re.compile(
    r"\[" + _IPV6_CORE_PATTERN + r"\]"
    r"|(?<![0-9A-F:.])" + _IPV6_CORE_PATTERN + r"(?![0-9A-F:.])",
    re.IGNORECASE,
)
_STEAM_ID_PATTERN = re.compile(r"(?<!\d)\d{17}(?!\d)")
_HOME_PATTERN = re.compile(
    r"(?<![\w.-])(?:/home/[^/\s]+|/Users/[^/\s]+|/root)(?=/|\s|$)"
)
_URL_QUERY_PATTERN = re.compile(
    r"\b(https?://[^\s?#\"'<>]+)\?[^\s#\"'<>]*",
    re.IGNORECASE,
)
_BEARER_PATTERN = re.compile(r"\bBearer\s+[A-Za-z0-9._~+/-]+=*", re.IGNORECASE)
_SENSITIVE_HEADER_PATTERN = re.compile(
    r"((?:\"|')?\b(?:authorization|proxy-authorization|cookie|set-cookie)\b"
    r"(?:\"|')?\s*[:=]\s*)[^\r\n]*",
    re.IGNORECASE,
)
_CREDENTIAL_PATTERN = re.compile(
    r"((?:\"|')?\b(?:"
    r"[A-Z0-9_-]*(?:password|passwd|token|secret)[A-Z0-9_-]*"
    r"|[A-Z0-9_-]*api[_-]?key[A-Z0-9_-]*"
    r")\b"
    r"(?:\"|')?\s*[:=]\s*)"
    r"(?:\"[^\"\r\n]*\"|'[^'\r\n]*'|[^\r\n]*)",
    re.IGNORECASE,
)
_ANSI_PATTERN = re.compile(r"\x1b\[[0-?]*[ -/]*[@-~]")


def _safe_string(value, fallback="Unknown"):
    if value is None:
        return fallback
    text = str(value).strip()
    return text or fallback


def _compact_output(value):
    text = _safe_string(value, fallback="")
    if len(text) > MAX_PROBE_OUTPUT_CHARS:
        return text[:MAX_PROBE_OUTPUT_CHARS] + " [probe output truncated]"
    return text


def _redact_ipv4(match):
    candidate = match.group(0)
    try:
        ipaddress.IPv4Address(candidate)
    except ipaddress.AddressValueError:
        return candidate
    return "<ipv4>"


def _redact_ipv6(match):
    candidate = match.group(0)
    address = candidate
    trailing_periods = ""
    if not address.endswith("]"):
        stripped_address = address.rstrip(".")
        trailing_periods = address[len(stripped_address) :]
        address = stripped_address
    if address.startswith("[") and address.endswith("]"):
        address = address[1:-1]
    if "%" in address:
        address = address.split("%", 1)[0]
    try:
        ipaddress.IPv6Address(address)
    except ipaddress.AddressValueError:
        return candidate
    return "<ipv6>" + trailing_periods


def redact_text(text, *, paths=()):
    """Redact common personal data and credentials from free-form text."""

    redacted = str(text or "")
    redacted = _ANSI_PATTERN.sub("", redacted)

    for raw_path in sorted(
        {_safe_string(path, fallback="") for path in paths if path},
        key=len,
        reverse=True,
    ):
        if raw_path and raw_path != "/":
            redacted = redacted.replace(raw_path.rstrip("/"), "<home>")

    redacted = _URL_QUERY_PATTERN.sub(r"\1?<redacted>", redacted)
    redacted = _BEARER_PATTERN.sub("Bearer <redacted>", redacted)
    redacted = _SENSITIVE_HEADER_PATTERN.sub(r"\1<redacted>", redacted)
    redacted = _CREDENTIAL_PATTERN.sub(r"\1<redacted>", redacted)
    redacted = _EMAIL_PATTERN.sub("<email>", redacted)
    redacted = _MAC_PATTERN.sub("<mac>", redacted)
    redacted = _IPV6_CANDIDATE_PATTERN.sub(_redact_ipv6, redacted)
    redacted = _IPV4_PATTERN.sub(_redact_ipv4, redacted)
    redacted = _STEAM_ID_PATTERN.sub("<steam-id>", redacted)
    redacted = _HOME_PATTERN.sub("<home>", redacted)

    return "".join(
        character
        if character in "\n\r\t" or ord(character) >= 32
        else "�"
        for character in redacted
    )


def _read_allowlisted_text(path, *, read_text=None, max_chars=MAX_PROBE_OUTPUT_CHARS):
    if read_text is None:
        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            value = handle.read(max_chars + 1)
    else:
        value = str(read_text(str(path)))

    if len(value) > max_chars:
        return value[:max_chars] + " [value truncated]"
    return value.strip()


def _run_probe(command_runner, args, *, command_env=None):
    try:
        result = command_runner(
            list(args),
            check=False,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=PROBE_TIMEOUT_SECONDS,
            env=command_env,
        )
    except Exception as error:
        return {
            "ok": False,
            "returnCode": None,
            "stdout": "",
            "error": _compact_output(error),
        }

    stdout = _compact_output(getattr(result, "stdout", ""))
    stderr = _compact_output(getattr(result, "stderr", ""))
    return_code = getattr(result, "returncode", None)
    return {
        "ok": return_code == 0,
        "returnCode": return_code,
        "stdout": stdout,
        "error": stderr or (None if return_code == 0 else "Command failed."),
    }


def _probe_vpower_service(command_runner, *, command_env=None):
    result = _run_probe(
        command_runner,
        (
            "systemctl",
            "show",
            VPOWER_SERVICE,
            "--no-pager",
            f"--property={','.join(VPOWER_PROPERTIES)}",
        ),
        command_env=command_env,
    )
    properties = {}
    for line in result["stdout"].splitlines():
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key in VPOWER_PROPERTIES:
            properties[key] = value
    result["properties"] = properties
    return result


def _probe_upower(command_runner, *, command_env=None):
    results = {}
    for property_name in UPOWER_PROPERTIES:
        results[property_name] = _run_probe(
            command_runner,
            (
                "busctl",
                "--system",
                "get-property",
                UPOWER_SERVICE,
                UPOWER_DISPLAY_DEVICE_PATH,
                UPOWER_DEVICE_INTERFACE,
                property_name,
            ),
            command_env=command_env,
        )
    return results


def _probe_vpower_files(*, read_text=None, path_exists=None):
    exists = path_exists or (lambda path: Path(path).exists())
    results = {}
    for filename in VPOWER_FILES:
        path = VPOWER_DIRECTORY / filename
        if not exists(str(path)):
            results[filename] = {"present": False, "value": None, "error": None}
            continue
        try:
            value = _read_allowlisted_text(path, read_text=read_text, max_chars=256)
        except Exception as error:
            results[filename] = {
                "present": True,
                "value": None,
                "error": _compact_output(error),
            }
        else:
            results[filename] = {
                "present": True,
                "value": value,
                "error": None,
            }
    return results


def _flush_logger_handlers(logger):
    seen = set()
    current = logger
    while current is not None:
        for handler in getattr(current, "handlers", ()):
            handler_id = id(handler)
            if handler_id in seen:
                continue
            seen.add(handler_id)
            try:
                handler.flush()
            except Exception:
                pass
        if not getattr(current, "propagate", False):
            break
        current = getattr(current, "parent", None)


def _read_log_tail(log_path, *, logger):
    _flush_logger_handlers(logger)
    if not log_path:
        return "", False, False, "Log path unavailable."

    file_descriptor = None
    try:
        open_flags = os.O_RDONLY
        open_flags |= getattr(os, "O_CLOEXEC", 0)
        open_flags |= getattr(os, "O_NOFOLLOW", 0)
        open_flags |= getattr(os, "O_NONBLOCK", 0)
        file_descriptor = os.open(log_path, open_flags)
        file_stat = os.fstat(file_descriptor)
        if not stat.S_ISREG(file_stat.st_mode):
            raise ValueError("Log path is not a regular file.")

        file_size = file_stat.st_size
        with os.fdopen(file_descriptor, "rb") as handle:
            file_descriptor = None
            start = max(0, file_size - MAX_LOG_TAIL_BYTES)
            handle.seek(start)
            if start > 0:
                handle.seek(start - 1)
                if handle.read(1) != b"\n":
                    handle.readline(MAX_LOG_TAIL_BYTES + 1)
            data = handle.read(MAX_LOG_TAIL_BYTES)
    except Exception as error:
        return "", False, False, _compact_output(error)
    finally:
        if file_descriptor is not None:
            os.close(file_descriptor)

    if not data:
        message = "No complete log lines are available in the bounded tail." if start > 0 else "Log is empty."
        return "", False, start > 0, message

    return data.decode("utf-8", errors="replace"), True, start > 0, None


def _probe_vram(*, supported_device, pending_reader, active_reader):
    pending = {"valueGb": None, "error": None, "probed": False}
    active = {"valueGb": None, "error": None, "probed": True}

    if supported_device:
        pending["probed"] = True
        try:
            pending["valueGb"] = pending_reader()
        except Exception as error:
            pending["error"] = _compact_output(error)
    else:
        pending["error"] = "Skipped because the DMI identity is unsupported."

    try:
        active["valueGb"] = active_reader()
        if active["valueGb"] is None:
            active["error"] = "No active amdgpu VRAM value was found."
    except Exception as error:
        active["error"] = _compact_output(error)

    return {"pending": pending, "active": active}


def _vram_summary(vram, *, supported_device):
    if not supported_device:
        return "Unavailable — unsupported device identity"

    pending = vram["pending"]
    active = vram["active"]
    if pending["error"]:
        return f"Unavailable — {pending['error']}"

    pending_text = f"{pending['valueGb']} GB pending"
    if active["valueGb"] is not None:
        return f"{pending_text}; {active['valueGb']} GB active"
    if active["error"]:
        return f"{pending_text}; active value unavailable — {active['error']}"
    return pending_text


def _battery_summary(enabled, vpower_service):
    prefix = "Enabled" if enabled else "Disabled"
    properties = vpower_service["properties"]
    load_state = properties.get("LoadState")
    active_state = properties.get("ActiveState")
    unit_file_state = properties.get("UnitFileState")

    if load_state == "not-found":
        return f"{prefix} — vpower.service not found"
    if load_state == "masked" or (unit_file_state or "").startswith("masked"):
        return f"{prefix} — vpower.service masked"
    if active_state == "failed":
        return f"{prefix} — vpower.service failed"
    if load_state:
        state = active_state or "unknown"
        return f"{prefix} — vpower.service {state}"
    if vpower_service["error"]:
        return f"{prefix} — service probe failed: {vpower_service['error']}"
    return f"{prefix} — vpower.service state unavailable"


def _format_probe(result):
    details = []
    if result.get("stdout"):
        details.append(result["stdout"])
    if result.get("error"):
        details.append(f"error={result['error']}")
    if result.get("returnCode") not in (None, 0):
        details.append(f"exit={result['returnCode']}")
    return "; ".join(details) or "No value returned."


def _format_vpower_file(result):
    if result.get("error"):
        return f"Error: {result['error']}"
    if not result.get("present"):
        return "Missing"
    return _safe_string(result.get("value"), fallback="Empty")


def _cap_utf8(text, limit=MAX_REPORT_BYTES):
    encoded = text.encode("utf-8")
    if len(encoded) <= limit:
        return text, False

    marker = "\n\n[Support report truncated to 64 KiB.]\n"
    marker_bytes = marker.encode("utf-8")
    clipped = encoded[: max(0, limit - len(marker_bytes))]
    return clipped.decode("utf-8", errors="ignore") + marker, True


def _format_gigabytes(value):
    if not isinstance(value, (int, float)) or isinstance(value, bool) or value <= 0:
        return "Unknown"
    return f"{value:g} GB"


def _append_report_section(lines, title, entries):
    """Append a SteamOS-style divider and a readable key/value transcript."""

    lines.extend((REPORT_DIVIDER, f"Section: {title}"))
    for label, value in entries:
        lines.append(f"{label}: {_safe_string(value)}")
    lines.append("")


_XDG_DESKTOP_DIR_PATTERN = re.compile(
    r'^\s*XDG_DESKTOP_DIR\s*=\s*"((?:\\.|[^"\\])*)"\s*(?:#.*)?$'
)


def _directory_open_flags():
    return (
        os.O_RDONLY
        | getattr(os, "O_CLOEXEC", 0)
        | getattr(os, "O_DIRECTORY", 0)
        | getattr(os, "O_NOFOLLOW", 0)
    )


def _read_xdg_user_dirs(home_directory):
    """Read the user's XDG directory config without following symlinks."""

    home_fd = None
    config_fd = None
    user_dirs_fd = None
    try:
        home_fd = os.open(home_directory, _directory_open_flags())
        config_fd = os.open(".config", _directory_open_flags(), dir_fd=home_fd)
        user_dirs_fd = os.open(
            "user-dirs.dirs",
            os.O_RDONLY
            | getattr(os, "O_CLOEXEC", 0)
            | getattr(os, "O_NOFOLLOW", 0),
            dir_fd=config_fd,
        )
        file_stat = os.fstat(user_dirs_fd)
        if not stat.S_ISREG(file_stat.st_mode) or file_stat.st_size > MAX_XDG_USER_DIRS_BYTES:
            return None

        with os.fdopen(user_dirs_fd, "rb") as user_dirs_file:
            user_dirs_fd = None
            contents = user_dirs_file.read(MAX_XDG_USER_DIRS_BYTES + 1)
        if len(contents) > MAX_XDG_USER_DIRS_BYTES:
            return None
        return contents.decode("utf-8")
    except (FileNotFoundError, NotADirectoryError, PermissionError, UnicodeDecodeError):
        return None
    except OSError:
        # A symlink or unsupported filesystem entry is not trusted as root.
        return None
    finally:
        for file_descriptor in (user_dirs_fd, config_fd, home_fd):
            if file_descriptor is not None:
                os.close(file_descriptor)


def _desktop_relative_path(home_directory):
    user_dirs = _read_xdg_user_dirs(home_directory)
    if user_dirs is None:
        return Path("Desktop")

    configured_value = None
    for line in user_dirs.splitlines():
        match = _XDG_DESKTOP_DIR_PATTERN.fullmatch(line)
        if match:
            configured_value = re.sub(r'\\(["\\$`])', r'\1', match.group(1))
            break

    if configured_value is None:
        return Path("Desktop")

    if configured_value in ("$HOME", "${HOME}"):
        raise ValueError("The Desktop directory is disabled.")
    if configured_value.startswith("$HOME/"):
        configured_path = home_directory / configured_value[len("$HOME/") :]
    elif configured_value.startswith("${HOME}/"):
        configured_path = home_directory / configured_value[len("${HOME}/") :]
    elif configured_value.startswith("/"):
        configured_path = Path(configured_value)
    else:
        raise ValueError("The configured Desktop directory is invalid.")

    normalized_path = Path(os.path.normpath(str(configured_path)))
    try:
        relative_path = normalized_path.relative_to(home_directory)
    except ValueError as error:
        raise ValueError("Desktop directory must stay within the user home.") from error
    if not relative_path.parts:
        raise ValueError("The Desktop directory is disabled.")
    return relative_path


def _open_directory_beneath_home(
    home_directory,
    relative_path,
    *,
    owner_uid,
    owner_gid,
):
    """Open or create a real directory beneath home without following links."""

    current_fd = os.open(home_directory, _directory_open_flags())
    try:
        for component in relative_path.parts:
            created = False
            try:
                next_fd = os.open(
                    component,
                    _directory_open_flags(),
                    dir_fd=current_fd,
                )
            except FileNotFoundError:
                try:
                    os.mkdir(component, mode=0o700, dir_fd=current_fd)
                except FileExistsError:
                    # Another caller won the race; open and validate its entry.
                    pass
                else:
                    created = True

                next_fd = os.open(
                    component,
                    _directory_open_flags(),
                    dir_fd=current_fd,
                )
            except OSError as error:
                if error.errno in (errno.ELOOP, errno.ENOTDIR):
                    raise ValueError(
                        "Desktop directory must not contain symbolic links."
                    ) from error
                raise

            if created:
                try:
                    os.fchown(next_fd, owner_uid, owner_gid)
                    os.fchmod(next_fd, 0o755)
                except Exception:
                    os.close(next_fd)
                    raise
            os.close(current_fd)
            current_fd = next_fd
        return current_fd
    except Exception:
        os.close(current_fd)
        raise


def save_report_to_desktop(report_text, *, user_home, user_name, now=None):
    """Save an already-generated report to the Decky user's Desktop."""

    if not isinstance(report_text, str) or not report_text.strip():
        raise ValueError("Support report text is empty.")

    payload = report_text.encode("utf-8")
    if len(payload) > MAX_REPORT_BYTES:
        raise ValueError("Support report exceeds the 64 KiB size limit.")

    user_account = pwd.getpwnam(user_name)
    home_directory = Path(user_home).resolve(strict=True)
    account_home = Path(user_account.pw_dir).resolve(strict=True)
    if home_directory != account_home:
        raise ValueError("Decky user and home directory do not match.")

    desktop_relative_path = _desktop_relative_path(home_directory)
    desktop_fd = _open_directory_beneath_home(
        home_directory,
        desktop_relative_path,
        owner_uid=user_account.pw_uid,
        owner_gid=user_account.pw_gid,
    )

    timestamp = (now or datetime.now().astimezone()).strftime("%Y%m%d-%H%M%S")
    open_flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
    open_flags |= getattr(os, "O_CLOEXEC", 0)
    open_flags |= getattr(os, "O_NOFOLLOW", 0)

    try:
        for sequence in range(1, 101):
            suffix = "" if sequence == 1 else f"-{sequence}"
            filename = f"{SAVED_REPORT_PREFIX}-{timestamp}{suffix}.txt"
            try:
                file_descriptor = os.open(
                    filename,
                    open_flags,
                    0o600,
                    dir_fd=desktop_fd,
                )
            except FileExistsError:
                continue

            try:
                os.fchmod(file_descriptor, 0o600)
                report_file = os.fdopen(file_descriptor, "wb")
                file_descriptor = None
                with report_file:
                    report_file.write(payload)
                    report_file.flush()
                    os.fsync(report_file.fileno())
                    os.fchown(
                        report_file.fileno(),
                        user_account.pw_uid,
                        user_account.pw_gid,
                    )
                    os.fchmod(report_file.fileno(), 0o600)
            except Exception:
                if file_descriptor is not None:
                    os.close(file_descriptor)
                try:
                    os.unlink(filename, dir_fd=desktop_fd)
                except FileNotFoundError:
                    pass
                raise

            display_directory = f"~/{desktop_relative_path.as_posix()}"
            return {
                "displayPath": f"{display_directory}/{filename}",
                "filename": filename,
            }

        raise FileExistsError("Could not allocate a unique report filename.")
    finally:
        os.close(desktop_fd)


def build_support_report(
    *,
    plugin_version,
    decky_version,
    debug_snapshot,
    supported_device,
    remaining_battery_enabled,
    logger,
    log_path,
    command_runner=subprocess.run,
    command_env=None,
    read_text=None,
    path_exists=None,
    pending_vram_reader,
    active_vram_reader,
    redaction_paths=(),
    now=None,
):
    """Return a support-report payload suitable for Decky's RPC bridge."""

    exists = path_exists or (lambda path: Path(path).exists())
    generated_at = (now or datetime.now(timezone.utc)).astimezone(timezone.utc)
    generated_at_text = generated_at.isoformat(timespec="seconds").replace("+00:00", "Z")

    snapshot = debug_snapshot or {}
    os_context = snapshot.get("osContext") or {}
    device_identity = snapshot.get("deviceIdentity") or {}
    firmware = snapshot.get("firmware") or {}
    memory = snapshot.get("memory") or {}
    input_plumber = snapshot.get("inputPlumber") or {}
    gyro_fix = input_plumber.get("gyroMountMatrixFix") or {}
    kernel_drivers = snapshot.get("zotacZoneKernelDrivers") or {}
    gamescope = snapshot.get("gamescope") or {}
    deckyzone_status = snapshot.get("deckyZoneStatus") or {}

    vram = _probe_vram(
        supported_device=bool(supported_device),
        pending_reader=pending_vram_reader,
        active_reader=active_vram_reader,
    )
    port_exists = bool(exists(PORT_DEVICE_PATH))

    try:
        lockdown = _read_allowlisted_text(LOCKDOWN_PATH, read_text=read_text)
        lockdown_error = None
    except Exception as error:
        lockdown = None
        lockdown_error = _compact_output(error)

    vpower_service = _probe_vpower_service(
        command_runner,
        command_env=command_env,
    )
    upower = _probe_upower(command_runner, command_env=command_env)
    vpower_files = _probe_vpower_files(
        read_text=read_text,
        path_exists=exists,
    )
    log_tail, log_included, log_tail_truncated, log_error = _read_log_tail(
        log_path,
        logger=logger,
    )

    summary = {
        "pluginVersion": _safe_string(plugin_version),
        "deckyVersion": _safe_string(decky_version),
        "os": _safe_string(os_context.get("prettyName")),
        "kernel": _safe_string(os_context.get("kernelRelease")),
        "vram": _vram_summary(vram, supported_device=bool(supported_device)),
        "battery": _battery_summary(
            bool(remaining_battery_enabled),
            vpower_service,
        ),
    }

    report_lines = []
    _append_report_section(
        report_lines,
        "Report metadata",
        (
            ("Generated", generated_at_text),
            ("DeckyZone", summary["pluginVersion"]),
            ("Decky Loader", summary["deckyVersion"]),
            ("DeckyZone status", deckyzone_status.get("message")),
            ("Supported device", bool(supported_device)),
        ),
    )
    _append_report_section(
        report_lines,
        "Device and operating system",
        (
            ("Operating system", summary["os"]),
            ("Kernel", summary["kernel"]),
            ("System RAM", _format_gigabytes(memory.get("systemRamGb"))),
            ("Vendor", device_identity.get("vendorName")),
            ("Product", device_identity.get("productName")),
            ("Board vendor", device_identity.get("boardVendor")),
            ("Board", device_identity.get("boardName")),
            (
                "EC firmware",
                _safe_string(firmware.get("ecVersion"), fallback="Unavailable"),
            ),
        ),
    )
    input_entries = [
        ("InputPlumber available", input_plumber.get("available")),
        ("InputPlumber version", input_plumber.get("version")),
        ("Profile", input_plumber.get("profileName")),
        ("Controller mode", input_plumber.get("controllerMode")),
        ("Controller mode control available", input_plumber.get("controllerModeAvailable")),
        ("Target gamepad present", input_plumber.get("targetGamepadPresent")),
        ("Keyboard present", input_plumber.get("keyboardPresent")),
        ("Controller runtime", input_plumber.get("controllerRuntimeState")),
        ("Gyro fix available", gyro_fix.get("available")),
        ("Gyro fix built in", gyro_fix.get("builtIn")),
        ("Gyro fix enabled", gyro_fix.get("enabled")),
        ("ZOTAC HID driver", kernel_drivers.get("zotacZoneHidLoaded")),
    ]
    for label, value in (
        ("Profile path", input_plumber.get("profilePath")),
        ("Target gamepad path", input_plumber.get("targetGamepadPath")),
        ("Keyboard path", input_plumber.get("keyboardPath")),
        ("Gyro fix blocked reason", gyro_fix.get("blockedReason")),
    ):
        if value:
            input_entries.append((label, value))
    _append_report_section(report_lines, "Input and controller", input_entries)
    _append_report_section(
        report_lines,
        "Display",
        (
            (
                "Display firmware",
                _safe_string(firmware.get("displayVersion"), fallback="Unavailable"),
            ),
            ("Gamescope version", gamescope.get("version")),
            ("Built-in profile", gamescope.get("builtInAvailable")),
            ("Managed profile", gamescope.get("managedProfileInstalled")),
            ("Green tint compensation", gamescope.get("greenTintFixEnabled")),
            ("Verification state", gamescope.get("verificationState")),
            ("Base asset available", gamescope.get("baseAssetAvailable")),
            ("Green tint asset available", gamescope.get("greenTintAssetAvailable")),
        ),
    )
    vram_entries = [
        ("Pending VRAM", _format_gigabytes(vram["pending"].get("valueGb"))),
        ("Active VRAM", _format_gigabytes(vram["active"].get("valueGb"))),
        ("/dev/port present", port_exists),
        ("Kernel lockdown", _safe_string(lockdown, fallback="Unavailable")),
    ]
    for label, value in (
        ("Pending probe error", vram["pending"].get("error")),
        ("Active probe error", vram["active"].get("error")),
        ("Kernel lockdown error", lockdown_error),
    ):
        if value:
            vram_entries.append((label, value))
    _append_report_section(report_lines, "VRAM", vram_entries)

    battery_entries = [
        ("Setting enabled", bool(remaining_battery_enabled)),
        ("vpower.service probe", vpower_service.get("ok")),
    ]
    if not vpower_service.get("ok"):
        if vpower_service.get("returnCode") is not None:
            battery_entries.append(
                ("vpower.service exit code", vpower_service.get("returnCode"))
            )
        if vpower_service.get("error"):
            battery_entries.append(
                ("vpower.service error", vpower_service.get("error"))
            )
    for property_name in VPOWER_PROPERTIES:
        battery_entries.append(
            (f"vpower.service {property_name}", vpower_service["properties"].get(property_name))
        )
    for property_name in UPOWER_PROPERTIES:
        battery_entries.append(
            (f"UPower {property_name}", _format_probe(upower[property_name]))
        )
    for filename in VPOWER_FILES:
        battery_entries.append(
            (
                f"/run/vpower/{filename}",
                _format_vpower_file(vpower_files[filename]),
            )
        )
    _append_report_section(report_lines, "Remaining battery time", battery_entries)

    report_lines.extend((REPORT_DIVIDER, "Section: Recent DeckyZone log"))
    if log_included:
        if log_tail_truncated:
            report_lines.append(
                f"[Only the newest {MAX_LOG_TAIL_BYTES // 1024} KiB is included.]"
            )
        report_lines.append(log_tail)
    else:
        report_lines.append(f"[Log unavailable: {_safe_string(log_error)}]")

    redacted_text = redact_text("\n".join(report_lines), paths=redaction_paths)
    redacted_summary = {
        key: redact_text(value, paths=redaction_paths)
        for key, value in summary.items()
    }
    capped_text, report_truncated = _cap_utf8(redacted_text)

    return {
        "generatedAt": generated_at_text,
        "summary": redacted_summary,
        "text": capped_text,
        "truncated": bool(log_tail_truncated or report_truncated),
        "logIncluded": bool(log_included),
    }
