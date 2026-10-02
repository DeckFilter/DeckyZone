"""Read-only version and interface checks for the SteamOS Manager bridge."""

from pathlib import Path
import re
import shlex
import subprocess
import tomllib
import xml.etree.ElementTree as ET

from .sysfs import Unavailable


# 26.4.0 added --device-config and fixed remote TDP registration at startup.
MINIMUM_MANAGER_VERSION = (26, 4, 0)
MANAGER_SCHEMA = "usr/share/dbus-1/interfaces/com.steampowered.SteamOSManager1.xml"
DEVICE_CONFIG = "usr/share/steamos-manager/devices/zotac-gaming-zone.toml"
INTERFACE_PREFIX = "com.steampowered.SteamOSManager1."
REQUIRED_PROPERTIES = {
    "PerformanceProfile1": {
        "AvailablePerformanceProfiles": ("as", "read"),
        "SuggestedDefaultPerformanceProfile": ("s", "read"),
        "PerformanceProfile": ("s", "readwrite"),
    },
    "TdpLimit1": {
        "TdpLimitMin": ("u", "read"),
        "TdpLimitMax": ("u", "read"),
        "TdpLimit": ("u", "readwrite"),
    },
    "RemoteInterface1": {"RemoteInterfaces": ("as", "read")},
}
# SteamOS's package database, followed by the standard Arch locations.
PACKAGE_DATABASES = (
    "usr/lib/holo/pacmandb/local",
    "usr/lib/sysimage/pacman/local",
    "var/lib/pacman/local",
)


def manager_release(version):
    """Compare the upstream release, not Arch's epoch or package revision.

    Reject development/prerelease labels instead of guessing their ordering.
    """
    match = re.fullmatch(r"(?:[0-9]+:)?([0-9]+)\.([0-9]+)\.([0-9]+)(?:-[0-9]+(?:\.[0-9]+)*)?", version or "")
    return tuple(map(int, match.groups())) if match else None


def check_interface_schema(xml, *, require_tdp=True):
    try:
        interfaces = {
            item.get("name"): {prop.get("name"): (prop.get("type"), prop.get("access"))
                               for prop in item.findall("property")}
            for item in ET.fromstring(xml).findall("interface")
        }
    except ET.ParseError as error:
        raise Unavailable("Cannot read SteamOS Manager interfaces") from error
    for name, required in REQUIRED_PROPERTIES.items():
        if name == "TdpLimit1" and not require_tdp:
            continue
        properties = interfaces.get(INTERFACE_PREFIX + name, {})
        for prop, signature in required.items():
            if properties.get(prop) != signature:
                raise Unavailable(f"SteamOS Manager is missing a compatible {name}.{prop}")


def adapted_device_config(original):
    """Keep stock settings except the two power interfaces owned by the bridge."""
    config = tomllib.loads(original)
    if (
        config.get("performance_profile", {}).get("platform_profile_name") != "zotac_zone_platform"
        or config.get("tdp_limit", {}).get("method") != "firmware_attribute"
        or config["tdp_limit"].get("firmware_attribute", {}).get("attribute") != "zotac_zone_platform"
    ):
        raise Unavailable("SteamOS Manager's ZONE power configuration changed; revalidation required")
    lines, skip = [], False
    for line in original.splitlines():
        if line.lstrip().startswith("["):
            header = re.fullmatch(r"\s*\[([^\[\]]+)\]\s*(?:#.*)?", line)
            name = header[1].strip() if header else ""
            skip = any(name == field or name.startswith(field + ".")
                       for field in ("performance_profile", "tdp_limit"))
        if not skip:
            lines.append(line)
    adapted = "\n".join(lines).rstrip() + '\n\n[tdp_limit]\nmethod = "remote_interface"\n'
    expected = {k: v for k, v in config.items() if k not in ("performance_profile", "tdp_limit")}
    expected["tdp_limit"] = {"method": "remote_interface"}
    if tomllib.loads(adapted) != expected:
        raise Unavailable("Cannot safely adapt SteamOS Manager's ZONE configuration")
    return adapted


def check_manager_options():
    """Run only on setup; never spawn Manager from the hardware monitor."""
    try:
        result = subprocess.run(
            ["/usr/lib/steamos-manager", "--help"], capture_output=True,
            text=True, check=True, timeout=3,
        )
    except (OSError, subprocess.SubprocessError) as error:
        raise Unavailable("Cannot verify SteamOS Manager's configuration options") from error
    if not re.search(r"(?:^|\s)--device-config(?:\s|=|$)", result.stdout):
        raise Unavailable("SteamOS Manager does not support device configuration overrides")


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
    release = manager_release(status["manager_version"])
    if release is None or release < MINIMUM_MANAGER_VERSION:
        blockers.append(
            "Requires SteamOS Manager 26.4.0 or newer; "
            f"found {status['manager_version'] or 'unknown'}"
        )
    # These are installed contracts, not proof of a live relay. Enablement also
    # checks the session bus after Manager has registered our provider.
    try:
        check_interface_schema((root / MANAGER_SCHEMA).read_text())
        adapted_device_config((root / DEVICE_CONFIG).read_text())
    except (OSError, ValueError, AttributeError, TypeError, Unavailable) as error:
        blockers.append(str(error) if isinstance(error, Unavailable)
                        else "Cannot verify SteamOS Manager's installed interfaces and ZONE configuration")
    status.update(compatible=not blockers, blockers=blockers)
    return status


def check_environment(root=Path("/")):
    status = environment_status(root)
    if not status["compatible"]:
        raise Unavailable("; ".join(status["blockers"]))
    return status
