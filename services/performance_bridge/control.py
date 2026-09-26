"""Fixed status/enable/disable commands for the DeckyZone Performance panel."""

import argparse
import fcntl
import json
import os
from pathlib import Path
import subprocess

from .install import INSTALL, SERVICE, UNIT
from .probe import inspect
from .sysfs import Unavailable


def systemctl(*args):
    return subprocess.run(
        ["/usr/bin/systemctl", *args],
        capture_output=True,
        text=True,
        timeout=65,
        check=True,
    ).stdout


def status():
    properties = dict(
        line.split("=", 1)
        for line in systemctl(
            "show", UNIT,
            "--property=LoadState,ActiveState,SubState,UnitFileState,FragmentPath",
        ).splitlines()
        if "=" in line
    )
    owned = (
        properties.get("LoadState") == "loaded"
        and properties.get("FragmentPath") == str(SERVICE)
        and (INSTALL / "manifest.json").is_file()
    )
    enabled = properties.get("UnitFileState") == "enabled"
    active = properties.get("ActiveState") == "active"
    report = inspect() if owned else None
    reason = None
    if not owned:
        reason = "Native performance bridge is not installed"
    elif not report["available"]:
        reason = "; ".join(report["blockers"])
    elif enabled and not active:
        reason = "Bridge stopped; turn it off and on to retry"
    return {
        "installed": owned,
        "enabled": enabled if owned else False,
        "active": active if owned else False,
        "available": bool(owned and report["available"]),
        "blockedReason": reason,
    }


def set_enabled(enabled):
    if type(enabled) is not bool:
        raise ValueError("Enabled must be a boolean")
    if os.geteuid() != 0:
        raise Unavailable("Changing native performance controls requires root")
    # Multiple UI surfaces/processes must not race service transitions.
    with (INSTALL / "control.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        before = status()
        if not before["installed"]:
            raise Unavailable(before["blockedReason"])
        if enabled and not before["available"]:
            raise Unavailable(before["blockedReason"])
        # Keep this separate from rollback: user presets and integration files
        # stay installed. Stop never reapplies limits or resets another plugin.
        systemctl("enable" if enabled else "disable", "--now", UNIT)
        after = status()
        if after["enabled"] != enabled or after["active"] != enabled:
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
        print(json.dumps({"ok": False, "error": str(error), "state": state}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
