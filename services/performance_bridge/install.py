"""Explicit, device-specific installation. Run from a verified staged payload."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import pwd
import shutil
import subprocess
import time
import tomllib

from .ryzenadj import BINARY_SHA256, INSTALL, check_device, check_ownership
from .compatibility import MANAGER_VERSION, check_environment


CONFIG = Path("/etc/deckyzone/zone-performance.toml")
UNIT = "deckyzone-performance.service"
MANAGER = "steamos-manager.service"
ROOT_DROPIN = Path(f"/etc/systemd/system/{MANAGER}.d/90-deckyzone-performance.conf")
USER_DROPIN = Path(f"/etc/systemd/user/{MANAGER}.d/90-deckyzone-performance.conf")
SERVICE = Path("/etc/systemd/system") / UNIT
POLICY = Path("/etc/dbus-1/system.d/com.deckyzone.Performance.conf")
REMOTE = Path("/etc/steamos-manager/remotes.d/deckyzone-performance.toml")
MARKER = Path("/etc/deckyzone/performance-enabled")
FILES = (CONFIG, ROOT_DROPIN, USER_DROPIN, SERVICE, POLICY, REMOTE, MARKER)


def run(*args):
    return subprocess.run(args, text=True, capture_output=True, check=True, timeout=30)


def user_systemctl(*args):
    user = pwd.getpwnam("deck")
    return run(
        "/usr/sbin/runuser",
        "-u",
        "deck",
        "--",
        "/usr/bin/env",
        f"XDG_RUNTIME_DIR=/run/user/{user.pw_uid}",
        f"DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/{user.pw_uid}/bus",
        "/usr/bin/systemctl",
        "--user",
        *args,
    )


def reload_managers():
    run("/usr/bin/systemctl", "daemon-reload")
    user_systemctl("daemon-reload")
    run("/usr/bin/systemctl", "restart", MANAGER)
    user_systemctl("restart", MANAGER)


def rollback():
    manifest = json.loads((INSTALL / "manifest.json").read_text())
    # Refuse to remove a file someone changed after installation.
    for raw, expected in manifest.items():
        path = Path(raw)
        if path.exists() and hashlib.sha256(path.read_bytes()).hexdigest() != expected:
            raise RuntimeError(
                f"Changed since installation; inspect before removing: {path}"
            )
    run("/usr/bin/systemctl", "disable", "--now", UNIT)
    for path in FILES:
        path.unlink(missing_ok=True)
    run("/usr/bin/systemctl", "reload", "dbus.service")
    reload_managers()
    print("Native bridge disabled; stock SteamOS Manager configuration restored.")
    print(
        "Last acknowledged power limits remain until firmware/another owner changes them."
    )


def install(payload):
    check_environment()
    check_device()
    check_ownership()
    version = run("/usr/bin/pacman", "-Q", "steamos-manager").stdout.strip()
    if version != f"steamos-manager {MANAGER_VERSION}":
        raise RuntimeError(f"Untested SteamOS Manager version: {version}")
    for path in (*FILES, INSTALL):
        if path.exists() or path.is_symlink():
            raise RuntimeError(f"Already present; will not overwrite: {path}")
    source = Path("/usr/share/steamos-manager/devices/zotac-gaming-zone.toml")
    original = source.read_text()
    config = tomllib.loads(original)
    if (
        config.get("performance_profile", {}).get("platform_profile_name")
        != "zotac_zone_platform"
    ):
        raise RuntimeError("Stock device configuration changed")
    # Preserve all unrelated sections verbatim; only replace these two backends.
    lines, skip = [], False
    for line in original.splitlines():
        if line.startswith("["):
            skip = line in (
                "[performance_profile]",
                "[tdp_limit]",
                "[tdp_limit.firmware_attribute]",
            )
        if not skip:
            lines.append(line)
    adapted = (
        "\n".join(lines).rstrip() + '\n\n[tdp_limit]\nmethod = "remote_interface"\n'
    )
    tomllib.loads(adapted)
    binary = Path("/home/deck/homebrew/plugins/PowerControl/bin/ryzenadj").read_bytes()
    if hashlib.sha256(binary).hexdigest() != BINARY_SHA256:
        raise RuntimeError("Installed RyzenAdj differs from the tested binary")
    packaging = payload / "services/performance_bridge/packaging"
    contents = {
        CONFIG: adapted,
        ROOT_DROPIN: f"[Service]\nExecStart=\nExecStart=/usr/lib/steamos-manager -r --device-config {CONFIG}\n",
        USER_DROPIN: f"[Service]\nExecStart=\nExecStart=/usr/lib/steamos-manager --device-config {CONFIG}\n",
        SERVICE: (packaging / "deckyzone-performance.service").read_text(),
        POLICY: (packaging / "com.deckyzone.Performance.conf.example").read_text(),
        REMOTE: (packaging / "deckyzone-performance.toml.example").read_text(),
        MARKER: "Explicitly enabled for the validated ZOTAC G0A1W BIOS 1.20.\n",
    }
    INSTALL.mkdir(mode=0o755)
    (INSTALL / "stock-zone-config.toml").write_text(original)
    (INSTALL / "installation.txt").write_text(f"{time.time()}\n{version}\n")
    shutil.copytree(payload / "services", INSTALL / "services")
    shutil.copytree(payload / "vendor", INSTALL / "vendor")
    (INSTALL / "bin").mkdir()
    (INSTALL / "bin/ryzenadj").write_bytes(binary)
    (INSTALL / "bin/ryzenadj").chmod(0o755)
    manifest = {
        str(path): hashlib.sha256(value.encode()).hexdigest()
        for path, value in contents.items()
    }
    (INSTALL / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    try:
        for path, content in contents.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(content)
            path.chmod(0o644)
        run("/usr/bin/systemctl", "daemon-reload")
        run("/usr/bin/systemctl", "reload", "dbus.service")
        run("/usr/bin/systemctl", "enable", "--now", UNIT)
        time.sleep(2)
        run("/usr/bin/systemctl", "is-active", UNIT)
        reload_managers()
        run("/usr/bin/systemctl", "is-active", UNIT, MANAGER)
        user_systemctl("is-active", MANAGER)
    except Exception:
        rollback()
        raise
    print(
        "Installed and started the native performance provider; rollback manifest saved."
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("install", "rollback"))
    parser.add_argument("--enable", action="store_true")
    args = parser.parse_args()
    if not args.enable or os.geteuid() != 0:
        parser.error("Requires root and explicit --enable")
    if args.action == "install":
        install(Path(__file__).resolve().parents[2])
    else:
        rollback()


if __name__ == "__main__":
    main()
