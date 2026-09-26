"""Read-only gates for the SteamOS Manager build validated on this device."""

from pathlib import Path
import shlex

from .sysfs import Unavailable


MANAGER_VERSION = "26.4.1-2"
# SteamOS's package database, followed by the standard Arch locations.
PACKAGE_DATABASES = (
    "usr/lib/holo/pacmandb/local",
    "usr/lib/sysimage/pacman/local",
    "var/lib/pacman/local",
)


def environment_status(root=Path("/")):
    status = {"os_id": None, "os_version": None, "manager_version": None}
    blockers = []
    try:
        release = root / "etc/os-release"
        if not release.exists():
            release = root / "usr/lib/os-release"
        values = {}
        for line in release.read_text().splitlines():
            key, separator, value = line.partition("=")
            if separator and key in ("ID", "VERSION_ID"):
                parts = shlex.split(value, comments=True)
                if len(parts) != 1:
                    raise ValueError("Invalid OS identity")
                values[key] = parts[0]
        status.update(os_id=values.get("ID"), os_version=values.get("VERSION_ID"))
    except (OSError, ValueError, UnicodeError):
        blockers.append("Cannot verify SteamOS identity")
    if status["os_id"] != "steamos":
        blockers.append("Native performance bridge requires SteamOS (ID=steamos)")

    # Read installed package metadata, not a cached query or a release-channel
    # label. The normal one-second monitor sees upgrades without spawning pacman.
    try:
        records = {}
        for database in PACKAGE_DATABASES:
            for path in (root / database).glob("steamos-manager-*/desc"):
                fields = {}
                for section in path.read_text().strip().split("\n\n"):
                    lines = section.splitlines()
                    if len(lines) == 2:
                        fields[lines[0]] = lines[1]
                if fields.get("%NAME%") == "steamos-manager":
                    records[path.resolve()] = fields.get("%VERSION%")
        if len(records) != 1:
            raise ValueError("Missing or ambiguous Manager package metadata")
        status["manager_version"] = next(iter(records.values()))
    except (OSError, ValueError, UnicodeError):
        blockers.append("Cannot verify installed SteamOS Manager package")
    if status["manager_version"] != MANAGER_VERSION:
        blockers.append(
            f"Requires tested SteamOS Manager {MANAGER_VERSION}; "
            f"found {status['manager_version'] or 'unknown'}"
        )
    status.update(compatible=not blockers, blockers=blockers)
    return status


def check_environment(root=Path("/")):
    status = environment_status(root)
    if not status["compatible"]:
        raise Unavailable("; ".join(status["blockers"]))
    return status
