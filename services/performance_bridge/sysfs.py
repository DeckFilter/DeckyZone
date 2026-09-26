"""Conditional ZOTAC sysfs adapter. Reads are driver caches, not telemetry.

ABI source: Neptune 5ab4af5e2eb9, drivers/platform/x86/zotac-zone-platform.c.
That implementation is NOT approved for writes; see probe.py and README.md.
"""

from dataclasses import dataclass
import os
from pathlib import Path


DRIVER = "zotac_zone_platform"
PROFILES = ("low-power", "balanced", "performance", "custom")
ATTRIBUTES = ("ppt_pl1_spl", "ppt_pl2_sppt", "ppt_pl3_fppt")


class Unavailable(RuntimeError):
    """The ABI or its current state cannot safely support the provider."""


@dataclass(frozen=True)
class Limits:
    minimum: int
    maximum: int
    step: int

    def accepts(self, value: int) -> bool:
        return (
            type(value) is int
            and self.minimum <= value <= self.maximum
            and (value - self.minimum) % self.step == 0
        )


@dataclass(frozen=True)
class Snapshot:
    profile: str
    limits: tuple[int, int, int]


class SysfsBackend:
    """Use only through the production validation gate or isolated test fixtures.

    There is deliberately no direct WMI, EC, RyzenAdj, or module-loading path.
    Profile presets belong to the driver; this adapter invents no preset table.
    """

    def __init__(self, root: Path = Path("/sys")):
        self.root = root
        candidates = [
            path
            for path in (root / "class/platform-profile").glob("*")
            if (path / "name").read_text().strip() == DRIVER
        ]
        if len(candidates) != 1:
            raise Unavailable("Exactly one ZOTAC platform-profile device is required")
        self.profile_dir = candidates[0]
        self.attribute_dir = root / "class/firmware-attributes" / DRIVER / "attributes"
        self.ranges = self._read_ranges()
        # SteamOS Manager exposes min/max, but no step. Steam uses whole watts.
        if any(limit.step != 1 for limit in self.ranges):
            raise Unavailable(
                "The native slider requires a 1 W step on every attribute"
            )
        self.minimum = max(limit.minimum for limit in self.ranges)
        self.maximum = min(limit.maximum for limit in self.ranges)
        if self.minimum > self.maximum:
            raise Unavailable("The three power attributes have no common range")
        self.read()

    def _read_ranges(self) -> tuple[Limits, ...]:
        result = []
        for name in ATTRIBUTES:
            base = self.attribute_dir / name
            values = [
                int((base / field).read_text().strip())
                for field in ("min_value", "max_value", "scalar_increment")
            ]
            limit = Limits(*values)
            if not 0 < limit.minimum <= limit.maximum <= 0xFFFFFFFF or limit.step <= 0:
                raise Unavailable(f"Invalid metadata for {name}")
            result.append(limit)
        return tuple(result)

    def read(self) -> Snapshot:
        if (self.profile_dir / "name").read_text().strip() != DRIVER:
            raise Unavailable("The profile device changed")
        choices = (self.profile_dir / "choices").read_text().split()
        if not set(PROFILES).issubset(choices):
            raise Unavailable("The driver does not expose all four profiles")
        if self._read_ranges() != self.ranges:
            raise Unavailable("Power-attribute ranges changed; revalidation required")
        profile = (self.profile_dir / "profile").read_text().strip()
        if profile not in PROFILES:
            raise Unavailable("Unknown current performance profile")
        values = tuple(
            int((self.attribute_dir / name / "current_value").read_text().strip())
            for name in ATTRIBUTES
        )
        if any(not limit.accepts(value) for limit, value in zip(self.ranges, values)):
            raise Unavailable("Cached power values are outside the advertised ranges")
        if profile == "custom" and len(set(values)) != 1:
            raise Unavailable("Custom limits differ; one slider cannot represent them")
        return Snapshot(profile, values)

    @staticmethod
    def _write(path: Path, value: str) -> None:
        # No create/truncate and exactly one unbuffered write. A buffered file's
        # close() could otherwise retry a failed flush against the hardware.
        data = (value + "\n").encode("ascii")
        fd = os.open(path, os.O_WRONLY | os.O_CLOEXEC)
        try:
            if os.write(fd, data) != len(data):
                raise OSError("Short sysfs write")
        finally:
            os.close(fd)

    def set_profile(self, profile: str) -> None:
        if profile not in PROFILES:
            raise ValueError("Unknown performance profile")
        self._write(self.profile_dir / "profile", profile)

    def set_tdp(self, watts: int) -> None:
        if any(not limit.accepts(watts) for limit in self.ranges):
            raise ValueError("TDP must be a whole watt within every attribute's range")
        # Validate ALL values before the first write. A failure stops the sequence.
        # Equal limits are the bridge's custom policy, not an OEM equivalence claim.
        for name in ATTRIBUTES:
            self._write(self.attribute_dir / name / "current_value", str(watts))
