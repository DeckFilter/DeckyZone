"""Install and control the bridge using DeckyZone's bundled offline payload."""

import json
from pathlib import Path
import subprocess


INSTALL = Path("/var/lib/deckyzone-performance")
PAYLOAD = Path(__file__).resolve().parents[1] / "assets/native-performance"


def unavailable(reason):
    return {
        "installed": False,
        "enabled": False,
        "active": False,
        "available": False,
        "needsSetup": True,
        "blockedReason": reason,
        "conflictingPlugins": [],
    }


def request(action):
    if action not in ("status", "enable", "disable"):
        raise ValueError("Unknown native performance action")
    if not (PAYLOAD / "services/performance_bridge/control.py").is_file():
        return {
            "ok": False,
            "state": unavailable("Native performance files are missing; reinstall DeckyZone"),
            "error": "Native performance files are missing; reinstall DeckyZone",
        }
    result = subprocess.run(
        ["/usr/bin/python3", "-m", "services.performance_bridge.control", action],
        cwd=PAYLOAD,
        env={"PATH": "/usr/bin", "PYTHONPATH": str(PAYLOAD / "vendor")},
        capture_output=True,
        text=True,
        # Include Manager recovery and failure cleanup after an interrupted OS
        # update; either can wait for systemd's normal service stop timeout.
        timeout=8 if action == "status" else 600,
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
