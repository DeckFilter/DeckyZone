"""Reconnect the current user's Manager after this provider starts or stops.

Manager 26.4.1 can stall when both remote names disappear during a provider
restart. Recreating the session Manager restores its remote watchers. This does
not restart Steam and never writes power limits itself.
"""

import os
from pathlib import Path
import pwd
import socket
import subprocess

from .ryzenadj import active_power_plugins, power_plugin_status
from .sysfs import Unavailable


def disable_after_conflict():
    """ExecStopPost: keep a detected Decky conflict off across service starts.

    Do not use --now here: this service is already stopping and waiting for its
    own stop job would deadlock. Disabling is handled by the system manager,
    outside this process's read-only filesystem sandbox.
    """
    try:
        active = active_power_plugins(power_plugin_status())
    except (OSError, ValueError, Unavailable) as error:
        print(f"Cannot check Decky conflict after stop: {error}")
        return
    if not active:
        return
    subprocess.run(
        ["/usr/bin/systemctl", "disable", "deckyzone-performance.service"],
        text=True, capture_output=True, check=True, timeout=5,
    )
    print(f"Disabled native performance controls: {' and '.join(active)} active.")


def manager_accepts_reconnect(user_options=None):
    """Never reconnect while either service manager is stopping or unavailable."""
    command = ["/usr/bin/systemctl"]
    if user_options is not None:
        command.append("--user")
    command.append("is-system-running")
    try:
        result = subprocess.run(
            command,
            **(user_options or {}),
            text=True,
            capture_output=True,
            check=False,
            timeout=2,
        )
    except (OSError, subprocess.TimeoutExpired):
        return False
    # A degraded manager returns a nonzero status but can still reconnect.
    return result.stdout.strip() in ("running", "degraded", "starting")


def notify_ready():
    address = os.environ.get("NOTIFY_SOCKET")
    if not address:
        return
    if address.startswith("@"):
        address = "\0" + address[1:]
    with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as connection:
        connection.connect(address)
        connection.sendall(b"READY=1")


def reconnect_manager():
    if not manager_accepts_reconnect():
        print("Skipping Manager reconnect: system is stopping or unavailable.")
        return
    user = pwd.getpwnam("deck")
    runtime = Path(f"/run/user/{user.pw_uid}")
    if not (runtime / "bus").exists():
        return  # At boot, the later session starts with the provider present.
    # Drop privileges directly. PAM's login/session writers are incompatible
    # with this service's read-only filesystem sandbox.
    user_options = {
        "user": user.pw_uid,
        "group": user.pw_gid,
        "extra_groups": (),
        "env": {
            "PATH": "/usr/bin",
            "XDG_RUNTIME_DIR": str(runtime),
            "DBUS_SESSION_BUS_ADDRESS": f"unix:path={runtime}/bus",
        },
    }
    if not manager_accepts_reconnect(user_options):
        print("Skipping Manager reconnect: user session is stopping or unavailable.")
        return
    try:
        subprocess.run(
            [
                "/usr/bin/systemctl",
                "--user",
                "try-restart",
                "steamos-manager.service",
            ],
            **user_options,
            check=True,
            timeout=25,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        # Shutdown can begin after the checks above. Preserve real reconnect
        # failures during normal operation, but accept canceled shutdown jobs.
        if manager_accepts_reconnect() and manager_accepts_reconnect(user_options):
            raise
        print("Manager reconnect interrupted by shutdown.")


if __name__ == "__main__":
    # systemd sets SERVICE_RESULT for ExecStopPost, not ExecStartPost.
    try:
        if "SERVICE_RESULT" in os.environ:
            disable_after_conflict()
    finally:
        reconnect_manager()
