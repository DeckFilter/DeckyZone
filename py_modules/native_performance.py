"""Control the separately installed bridge through its fixed command interface."""

import json
from pathlib import Path
import subprocess


INSTALL = Path("/var/lib/deckyzone-performance")


def unavailable(reason):
    return {
        "installed": False,
        "enabled": False,
        "active": False,
        "available": False,
        "blockedReason": reason,
        "conflictingPlugins": [],
    }


def request(action):
    if action not in ("status", "enable", "disable"):
        raise ValueError("Unknown native performance action")
    if not (INSTALL / "services/performance_bridge/control.py").is_file():
        return {
            "ok": False,
            "state": unavailable("Install or update the native performance bridge first"),
            "error": "Native performance bridge is not installed or needs updating",
        }
    result = subprocess.run(
        ["/usr/bin/python3", "-m", "services.performance_bridge.control", action],
        cwd=INSTALL,
        env={"PATH": "/usr/bin", "PYTHONPATH": str(INSTALL / "vendor")},
        capture_output=True,
        text=True,
        timeout=8 if action == "status" else 75,
        check=False,
    )
    try:
        response = json.loads(result.stdout)
        if not isinstance(response, dict) or type(response.get("ok")) is not bool:
            raise ValueError("Invalid bridge response")
        if result.returncode != 0 and response["ok"]:
            raise ValueError("Bridge command failed")
        return response
    except (ValueError, TypeError) as error:
        raise RuntimeError("Could not read native performance bridge status") from error


def get_status():
    response = request("status")
    if response.get("state") is None:
        raise RuntimeError(response.get("error", "Could not read bridge status"))
    return response["state"]


def set_enabled(enabled):
    if type(enabled) is not bool:
        raise ValueError("Enabled must be a boolean")
    return request("enable" if enabled else "disable")
