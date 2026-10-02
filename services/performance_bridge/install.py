"""Install or repair the opt-in bridge from DeckyZone's verified offline payload."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import tempfile
import time

from .ryzenadj import BINARY_SHA256, INSTALL, check_device, check_ownership
from .compatibility import (
    DEVICE_CONFIG, INTERFACE_PREFIX, adapted_device_config, check_environment,
    check_interface_schema, check_manager_options,
)
from .sysfs import PROFILES, Unavailable

CONFIG = Path("/etc/deckyzone/zone-performance.toml")
UNIT = "deckyzone-performance.service"
MANAGER = "steamos-manager.service"
ROOT_DROPIN = Path(f"/etc/systemd/system/{MANAGER}.d/90-deckyzone-performance.conf")
USER_DROPIN = Path(f"/etc/systemd/user/{MANAGER}.d/90-deckyzone-performance.conf")
SERVICE = Path("/etc/systemd/system") / UNIT
POLICY = Path("/etc/dbus-1/system.d/com.deckyzone.Performance.conf")
REMOTE = Path("/etc/steamos-manager/remotes.d/deckyzone-performance.toml")
MARKER = Path("/etc/deckyzone/performance-enabled")
KEEP_LIST = Path("/etc/atomic-update.conf.d/90-deckyzone-performance.conf")
FILES = (CONFIG, ROOT_DROPIN, USER_DROPIN, SERVICE, POLICY, REMOTE, MARKER, KEEP_LIST)


def run(*args, timeout=65):
    return subprocess.run(args, text=True, capture_output=True, check=True, timeout=timeout)


def user_command(*args, timeout=65):
    user = pwd.getpwnam("deck")
    return run(
        "/usr/sbin/runuser", "-u", "deck", "--", "/usr/bin/env",
        f"XDG_RUNTIME_DIR=/run/user/{user.pw_uid}",
        f"DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/{user.pw_uid}/bus",
        *args, timeout=timeout,
    )


def user_systemctl(*args, timeout=65):
    return user_command("/usr/bin/systemctl", "--user", *args, timeout=timeout)


def verify_manager_relay():
    """Read back the native contract; never probe it by writing power limits."""
    bus = ("/usr/bin/busctl", "--user", "--timeout=2")
    target = ("com.steampowered.SteamOSManager1", "/com/steampowered/SteamOSManager1")
    deadline = time.monotonic() + 8
    while True:
        try:
            profile = json.loads((INSTALL / "state.json").read_text())["profile"]
            xml = user_command(*bus, "--xml-interface", "introspect", *target, timeout=3).stdout
            check_interface_schema(xml, require_tdp=profile == "custom")
            for interface, prop, expected in (
                ("PerformanceProfile1", "AvailablePerformanceProfiles", set(PROFILES)),
                ("RemoteInterface1", "RemoteInterfaces", {
                    INTERFACE_PREFIX + "PerformanceProfile1",
                    *([INTERFACE_PREFIX + "TdpLimit1"] if profile == "custom" else []),
                }),
            ):
                reply = user_command(*bus, "--json=short", "get-property", *target,
                                     INTERFACE_PREFIX + interface, prop, timeout=3).stdout
                value = json.loads(reply)
                if value.get("type") != "as" or not expected.issubset(value.get("data", [])):
                    raise Unavailable("SteamOS Manager has not registered the native controls")
            return
        except (OSError, ValueError, KeyError, TypeError, AttributeError,
                subprocess.SubprocessError, Unavailable) as error:
            if time.monotonic() >= deadline:
                raise Unavailable("SteamOS Manager could not expose native performance controls") from error
            time.sleep(0.25)  # Read-only discovery can lag behind service startup.


def reload_managers():
    run("/usr/bin/systemctl", "daemon-reload")
    user_systemctl("daemon-reload")
    run("/usr/bin/systemctl", "reset-failed", MANAGER)
    run("/usr/bin/systemctl", "restart", MANAGER)
    user_systemctl("reset-failed", MANAGER)
    # A user Manager stranded by a missing device config can take systemd's
    # full 90-second stop timeout. Allow both that stop and the next startup.
    user_systemctl("restart", MANAGER, timeout=200)


def atomic_write(path, data, mode=0o644):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "wb") as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def installed_manifest():
    path = INSTALL / "manifest.json"
    if not path.exists():
        if INSTALL.exists() and any(INSTALL.iterdir()):
            raise Unavailable("Unrecognized bridge installation; inspect it before continuing")
        return {}
    manifest = json.loads(path.read_text())
    if not isinstance(manifest, dict) or set(manifest) - {str(p) for p in FILES}:
        raise Unavailable("Invalid bridge installation record")
    return manifest


def check_existing():
    manifest = installed_manifest()
    for path in FILES:
        if not path.exists() and not path.is_symlink():
            continue
        if (
            path.is_symlink() or not path.is_file()
            or hashlib.sha256(path.read_bytes()).hexdigest() != manifest.get(str(path))
        ):
            raise Unavailable(f"Bridge file was changed outside DeckyZone: {path}")
    return manifest


def payload_manifest(payload):
    manifest = json.loads((payload / "payload.json").read_text())
    required = {"bin/ryzenadj", "vendor/dbus_next/__init__.py", "services/performance_bridge/control.py"}
    if not isinstance(manifest, dict) or not required.issubset(manifest):
        raise Unavailable("Native performance payload is incomplete; reinstall DeckyZone")
    for raw, expected in manifest.items():
        path = Path(raw)
        if not path.parts or path.is_absolute() or ".." in path.parts or path.parts[0] not in ("services", "vendor", "bin", "licenses"):
            raise Unavailable("Invalid native performance payload path")
        source = payload / path
        if source.is_symlink() or hashlib.sha256(source.read_bytes()).hexdigest() != expected:
            raise Unavailable("Native performance payload changed; reinstall DeckyZone")
    if manifest["bin/ryzenadj"] != BINARY_SHA256:
        raise Unavailable("Packaged RyzenAdj differs from the validated binary")
    return manifest


def installation_error(payload=None):
    """Report missing/changed integration files instead of unrelated WMI errors."""
    try:
        manifest = installed_manifest()
        for path in FILES:
            if not path.is_file() or str(path) not in manifest:
                return "Bridge installation is incomplete"
            if path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != manifest[str(path)]:
                return "Bridge files have changed"
        if payload is not None:
            for raw, expected in payload_manifest(payload).items():
                path = INSTALL / raw
                if not path.is_file() or path.is_symlink() or hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                    return "Bridge update required"
        if (INSTALL / "stock-zone-config.toml").read_text() != (Path("/") / DEVICE_CONFIG).read_text():
            return "SteamOS Manager's device configuration changed"
    except (OSError, ValueError, Unavailable):
        return "Bridge installation could not be verified"
    return None


def preflight(payload):
    check_environment()
    check_device()
    check_ownership()
    check_manager_options()
    payload_manifest(payload)
    check_existing()


def integration_contents(payload):
    original = (Path("/") / DEVICE_CONFIG).read_text()
    adapted = adapted_device_config(original)
    packaging = payload / "services/performance_bridge/packaging"
    return original, {
        CONFIG: adapted,
        ROOT_DROPIN: f"[Service]\nExecStart=\nExecStart=/usr/lib/steamos-manager -r --device-config {CONFIG}\n",
        USER_DROPIN: f"[Service]\nExecStart=\nExecStart=/usr/lib/steamos-manager --device-config {CONFIG}\n",
        SERVICE: (packaging / "deckyzone-performance.service").read_text(),
        POLICY: (packaging / "com.deckyzone.Performance.conf.example").read_text(),
        REMOTE: (packaging / "deckyzone-performance.toml.example").read_text(),
        MARKER: "Explicitly enabled for the validated ZOTAC G0A1W BIOS 1.20.\n",
        KEEP_LIST: "# Preserve the native performance bridge across SteamOS updates.\n"
        + "".join(f"{path}\n" for path in FILES),
    }


def rollback():
    manifest = check_existing()
    run("/usr/bin/systemctl", "disable", "--now", UNIT)
    for path in FILES:
        if str(path) in manifest:
            path.unlink(missing_ok=True)
    run("/usr/bin/systemctl", "reload", "dbus.service")
    reload_managers()


def install(payload):
    """Prepare files and reconnect Managers; control.py owns final enablement."""
    preflight(payload)
    if installation_error(payload) is None:
        return
    original, contents = integration_contents(payload)
    runtime = payload_manifest(payload)
    previous = installed_manifest()
    # Keep the prior files and user-selected limits outside the live installation.
    backup = INSTALL.parent / "deckyzone-performance-backups" / str(time.time_ns())
    backup.mkdir(parents=True, mode=0o700)
    if INSTALL.exists():
        shutil.copytree(INSTALL, backup / "runtime")
    for path in FILES:
        if path.is_file():
            target = backup / path.relative_to("/")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
    if SERVICE.exists():
        run("/usr/bin/systemctl", "stop", UNIT)
    INSTALL.mkdir(mode=0o755, exist_ok=True)
    # Write ownership records before the integration, so an interrupted setup can
    # be repaired and failure cleanup only removes files belonging to this setup.
    manifest = {str(path): hashlib.sha256(value.encode()).hexdigest() for path, value in contents.items()}
    atomic_write(INSTALL / "manifest.json", (json.dumps(manifest, indent=2) + "\n").encode())
    try:
        for raw in runtime:
            atomic_write(INSTALL / raw, (payload / raw).read_bytes(), 0o755 if raw == "bin/ryzenadj" else 0o644)
        atomic_write(INSTALL / "payload.json", (payload / "payload.json").read_bytes())
        atomic_write(INSTALL / "stock-zone-config.toml", original.encode())
        for path, content in contents.items():
            atomic_write(path, content.encode())
        run("/usr/bin/systemctl", "daemon-reload")
        run("/usr/bin/systemctl", "reload", "dbus.service")
        reload_managers()
    except Exception:
        # Never leave Manager referencing an absent configuration after failure.
        # Files can still belong to the previous version if copying was partial.
        for path in FILES:
            if path.exists() and (
                path.is_symlink() or not path.is_file()
                or hashlib.sha256(path.read_bytes()).hexdigest()
                not in (previous.get(str(path)), manifest.get(str(path)))
            ):
                raise Unavailable(f"Setup failed and a bridge file changed: {path}")
        if SERVICE.exists():
            run("/usr/bin/systemctl", "disable", "--now", UNIT)
        for path in FILES:
            path.unlink(missing_ok=True)
        run("/usr/bin/systemctl", "reload", "dbus.service")
        reload_managers()
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("install", "rollback"))
    parser.add_argument("--enable", action="store_true")
    args = parser.parse_args()
    if not args.enable or os.geteuid() != 0:
        parser.error("Requires root and explicit --enable")
    if args.action == "install":
        from .control import set_enabled
        set_enabled(True)
    else:
        rollback()
        print("Native bridge disabled; stock SteamOS Manager configuration restored.")


if __name__ == "__main__":
    main()
