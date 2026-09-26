"""Bounded fallback for the tested G0A1W / BIOS 1.20 / Ryzen 8840U.

Reads expose acknowledged requests, NOT measured firmware limits. The kernel
blocks RyzenAdj's metrics table on this device. RAPL load tests independently
verified the 8 W and 15 W commands before enabling this backend.
"""

import hashlib
import json
import logging
import os
from pathlib import Path
import stat
import subprocess
import time

from .sysfs import PROFILES, Snapshot, Unavailable


LOG = logging.getLogger(__name__)
BINARY_SHA256 = "486634df3ff94224041cd082f56f13030daecf022cda7bf5eec26e888d5e80d7"
PRESETS = {"low-power": 8, "balanced": 15, "performance": 28}
INSTALL = Path("/var/lib/deckyzone-performance")
POWER_PLUGINS = ("PowerControl", "SimpleDeckyTDP")
POWERCONTROL_TEST_MARKER = "run/deckyzone-powercontrol-coexistence-test"


def powercontrol_coexistence_test(root=Path("/")):
    """Explicit, root-owned opt-in for one boot; not a fan-only guarantee."""
    marker = root / POWERCONTROL_TEST_MARKER
    try:
        info = marker.lstat()
        return (
            stat.S_ISREG(info.st_mode)
            and info.st_uid == 0
            and not info.st_mode & 0o022
            and marker.read_text() == "allow-powercontrol-for-testing\n"
        )
    except (OSError, UnicodeError):
        return False


def check_device(root=Path("/")):
    expected = {"sys_vendor": "ZOTAC", "board_name": "G0A1W", "bios_version": "1.20"}
    for name, value in expected.items():
        if (root / "sys/class/dmi/id" / name).read_text().strip() != value:
            raise Unavailable(f"Untested device or firmware: {name}")
    if "AMD Ryzen 7 8840U" not in (root / "proc/cpuinfo").read_text():
        raise Unavailable("Untested APU")
    # Never compete with a future working native backend.
    if list((root / "sys/class/platform-profile").glob("*")):
        raise Unavailable("Native platform profiles appeared; revalidate integration")


def power_plugin_status(root=Path("/")):
    loader = json.loads((root / "home/deck/homebrew/settings/loader.json").read_text())
    if not isinstance(loader, dict):
        raise Unavailable("Cannot verify disabled Decky power plugins")
    disabled = loader.get("disabled_plugins", [])
    if not isinstance(disabled, list) or any(
        not isinstance(name, str) for name in disabled
    ):
        raise Unavailable("Cannot verify disabled Decky power plugins")
    return {
        name: {
            "installed": (root / "home/deck/homebrew/plugins" / name).exists(),
            "disabled_in_decky": name in disabled,
            "coexistence_test": (
                name == "PowerControl" and powercontrol_coexistence_test(root)
            ),
        }
        for name in POWER_PLUGINS
    }


def check_ownership(root=Path("/")):
    for name, state in power_plugin_status(root).items():
        if (
            state["installed"]
            and not state["disabled_in_decky"]
            and not state["coexistence_test"]
        ):
            raise Unavailable(
                f"Disable {name} before using native performance controls"
            )
    for path in (root / "proc").glob("[0-9]*/comm"):
        try:
            name = path.read_text().strip()
        except FileNotFoundError:
            continue
        if name in ("hhd", "adjustor", "power-profiles-d", "ryzenadj"):
            raise Unavailable(f"Another power writer is running: {name}")


class RyzenAdjBackend:
    minimum = 8
    maximum = 28

    def __init__(self, binary=INSTALL / "bin/ryzenadj", state=INSTALL / "state.json"):
        self.binary = binary
        self.state_path = state
        self.snapshot = None
        self.custom_tdp = 15
        self.last_power = self._power_source()
        self.last_sleep = self._sleep_elapsed()
        self.validate_binary()

    def validate_binary(self):
        info = self.binary.stat()
        if info.st_uid != 0 or info.st_mode & 0o022:
            raise Unavailable("RyzenAdj must be root-owned and not writable by others")
        if hashlib.sha256(self.binary.read_bytes()).hexdigest() != BINARY_SHA256:
            raise Unavailable("RyzenAdj changed; revalidation required")

    @staticmethod
    def _power_source():
        return tuple(
            (str(path), path.read_text().strip())
            for path in sorted(Path("/sys/class/power_supply").glob("*/online"))
        )

    @staticmethod
    def _sleep_elapsed():
        return time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic()

    def initialize(self):
        profile, watts = "custom", 15
        if self.state_path.exists():
            state = json.loads(self.state_path.read_text())
            profile, watts = state["profile"], state["watts"]
            self.custom_tdp = state["custom_tdp"]
            if profile not in PROFILES or type(self.custom_tdp) is not int:
                raise Unavailable("Invalid saved performance state")
            if not self.minimum <= self.custom_tdp <= self.maximum:
                raise Unavailable("Invalid saved custom TDP")
            if profile in PRESETS and watts != PRESETS[profile]:
                raise Unavailable("Saved preset does not match validated limits")
        self._apply(profile, watts)

    def _apply(self, profile, watts):
        if (
            profile not in PROFILES
            or type(watts) is not int
            or not self.minimum <= watts <= self.maximum
        ):
            raise ValueError("TDP must be an integer between 8 and 28 W")
        self.validate_binary()
        # One command per limit: a failed command stops the sequence immediately.
        # The inspected ONE Launcher fallback sets Slow, STAPM, then Fast.
        for name in ("slow", "stapm", "fast"):
            try:
                result = subprocess.run(
                    [str(self.binary), f"--{name}-limit={watts * 1000}"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                    env={"PATH": "/usr/bin", "LC_ALL": "C"},
                )
            except subprocess.TimeoutExpired as error:
                raise Unavailable(f"RyzenAdj {name} timed out") from error
            # v0.18.0 contains this spelling. Exit status alone is insufficient.
            expected = f"Sucessfully set {name}_limit to {watts * 1000}"
            if result.returncode != 0 or expected not in result.stdout.splitlines():
                raise Unavailable(
                    f"RyzenAdj {name} did not acknowledge the limit: {result.stdout.strip()}"
                )
        self.snapshot = Snapshot(profile, (watts,) * 3)
        if profile == "custom":
            self.custom_tdp = watts
        data = {"profile": profile, "watts": watts, "custom_tdp": self.custom_tdp}
        temporary = self.state_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(data) + "\n")
        os.replace(temporary, self.state_path)
        LOG.info("SMU acknowledged %s: Slow/STAPM/Fast = %d W", profile, watts)

    def read(self):
        if self.snapshot is None:
            raise Unavailable("No acknowledged limits yet")
        return self.snapshot

    def refresh_after_power_event(self):
        power, sleep = self._power_source(), self._sleep_elapsed()
        changed = power != self.last_power or sleep - self.last_sleep > 1
        self.last_power, self.last_sleep = power, sleep
        if changed:
            LOG.info(
                "Power-source change or resume: reapplying acknowledged limits once"
            )
            self._apply(self.snapshot.profile, self.snapshot.limits[0])

    def set_profile(self, profile):
        self._apply(profile, PRESETS[profile])

    def set_tdp(self, watts):
        self._apply("custom", watts)
