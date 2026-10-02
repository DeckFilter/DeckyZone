"""Fixed status/enable/disable commands for the DeckyZone Performance panel."""

import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess

from .install import INSTALL, SERVICE, UNIT, install, installation_error, preflight
from .ryzenadj import active_power_plugins, power_plugin_status
from .sysfs import Unavailable

PAYLOAD = Path(__file__).resolve().parents[2]


def systemctl(*args):
    return subprocess.run(
        ["/usr/bin/systemctl", *args], capture_output=True, text=True,
        timeout=65, check=True,
    ).stdout


def status():
    properties = dict(
        line.split("=", 1)
        for line in systemctl(
            "show", UNIT,
            "--property=LoadState,ActiveState,SubState,UnitFileState,FragmentPath",
        ).splitlines() if "=" in line
    )
    owned = (
        properties.get("LoadState") == "loaded"
        and properties.get("FragmentPath") == str(SERVICE)
        and (INSTALL / "manifest.json").is_file()
    )
    enabled = owned and properties.get("UnitFileState") == "enabled"
    active = owned and properties.get("ActiveState") == "active"
    needs_setup = installation_error(PAYLOAD) is not None
    reason = None
    conflicts = []
    try:
        conflicts = active_power_plugins(power_plugin_status())
        preflight(PAYLOAD)
    except (OSError, ValueError, Unavailable) as error:
        reason = str(error)
    available = reason is None
    if available and enabled and not active and not needs_setup:
        reason = "Bridge stopped; turn it off and on to retry"
    return {
        "installed": owned, "enabled": enabled, "active": active,
        "available": available, "needsSetup": needs_setup,
        "blockedReason": reason, "conflictingPlugins": conflicts,
    }


def set_enabled(enabled):
    if type(enabled) is not bool:
        raise ValueError("Enabled must be a boolean")
    if os.geteuid() != 0:
        raise Unavailable("Changing native performance controls requires root")
    # This lock also covers a first installation, before INSTALL exists.
    with (INSTALL.parent / "deckyzone-performance.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = status()
        if enabled:
            if not before["available"]:
                raise Unavailable(before["blockedReason"])
            install(PAYLOAD)
        elif not before["installed"]:
            return before
        # Stop never reapplies limits or resets another plugin.
        systemctl("enable" if enabled else "disable", "--now", UNIT)
        after = status()
        if after["enabled"] != enabled or after["active"] != enabled or (enabled and after["needsSetup"]):
            raise Unavailable(after["blockedReason"] or "Bridge state did not change")
        return after


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("status", "enable", "disable"))
    args = parser.parse_args()
    try:
        state = status() if args.action == "status" else set_enabled(args.action == "enable")
        print(json.dumps({"ok": True, "state": state}))
        return 0
    except (OSError, ValueError, Unavailable, subprocess.SubprocessError) as error:
        try:
            state = status()
        except (OSError, ValueError, Unavailable, subprocess.SubprocessError):
            state = None
        message = (
            "SteamOS took too long to respond. Try again."
            if isinstance(error, subprocess.TimeoutExpired) else str(error)
        )
        print(json.dumps({"ok": False, "error": message, "state": state}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
