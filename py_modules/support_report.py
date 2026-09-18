"""Build a bounded, redacted DeckyZone support report.

The collector deliberately probes only a small allowlist of local files and
services. It never changes service state and never sends the report anywhere.
"""

from __future__ import annotations

import ipaddress
import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


MAX_REPORT_BYTES = 64 * 1024
MAX_LOG_TAIL_BYTES = 32 * 1024
MAX_PROBE_OUTPUT_CHARS = 4096
PROBE_TIMEOUT_SECONDS = 3

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
    r"((?:\"|')?\b(?:password|passwd|token|secret|api[_-]?key)\b"
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

    try:
        path = Path(log_path)
        file_size = path.stat().st_size
        with path.open("rb") as handle:
            start = max(0, file_size - MAX_LOG_TAIL_BYTES)
            handle.seek(start)
            if start > 0:
                handle.seek(start - 1)
                if handle.read(1) != b"\n":
                    handle.readline(MAX_LOG_TAIL_BYTES + 1)
            data = handle.read(MAX_LOG_TAIL_BYTES)
    except Exception as error:
        return "", False, False, _compact_output(error)

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
    if result.get("returnCode") is not None:
        details.append(f"exit={result['returnCode']}")
    return "; ".join(details) or "No value returned."


def _cap_utf8(text, limit=MAX_REPORT_BYTES):
    encoded = text.encode("utf-8")
    if len(encoded) <= limit:
        return text, False

    marker = "\n\n[Support report truncated to 64 KiB.]\n"
    marker_bytes = marker.encode("utf-8")
    clipped = encoded[: max(0, limit - len(marker_bytes))]
    return clipped.decode("utf-8", errors="ignore") + marker, True


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

    os_context = (debug_snapshot or {}).get("osContext") or {}
    device_identity = (debug_snapshot or {}).get("deviceIdentity") or {}

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

    report_lines = [
        "DeckyZone support report",
        f"Generated: {generated_at_text}",
        "Privacy: Generated locally. Common identifiers are redacted, but review before sharing.",
        "",
        "Summary",
        f"- DeckyZone: {summary['pluginVersion']}",
        f"- Decky Loader: {summary['deckyVersion']}",
        f"- OS: {summary['os']}",
        f"- Kernel: {summary['kernel']}",
        f"- VRAM: {summary['vram']}",
        f"- Battery bridge: {summary['battery']}",
        "",
        "Device identity",
        f"- Vendor: {_safe_string(device_identity.get('vendorName'))}",
        f"- Product: {_safe_string(device_identity.get('productName'))}",
        f"- Board: {_safe_string(device_identity.get('boardName'))}",
        f"- Board vendor: {_safe_string(device_identity.get('boardVendor'))}",
        f"- Supported: {bool(supported_device)}",
        "",
        "VRAM probes",
        f"- /dev/port exists: {port_exists}",
        f"- Pending: {json.dumps(vram['pending'], sort_keys=True)}",
        f"- Active: {json.dumps(vram['active'], sort_keys=True)}",
        f"- Kernel lockdown: {_safe_string(lockdown, fallback='Unavailable')}",
        f"- Kernel lockdown error: {_safe_string(lockdown_error, fallback='None')}",
        "",
        "Remaining battery time probes",
        f"- Setting enabled: {bool(remaining_battery_enabled)}",
        f"- vpower.service: {json.dumps(vpower_service, sort_keys=True)}",
    ]

    for property_name in UPOWER_PROPERTIES:
        report_lines.append(
            f"- UPower {property_name}: {_format_probe(upower[property_name])}"
        )
    for filename in VPOWER_FILES:
        report_lines.append(
            f"- /run/vpower/{filename}: "
            f"{json.dumps(vpower_files[filename], sort_keys=True)}"
        )

    report_lines.extend(
        (
            "",
            "Existing debug snapshot",
            json.dumps(debug_snapshot or {}, indent=2, sort_keys=True, default=str),
            "",
            "DeckyZone plugin log tail",
        )
    )
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
