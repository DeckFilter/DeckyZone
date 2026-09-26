#!/usr/bin/env python3
"""Shareable read-only ZONE firmware-interface inventory. No sudo required.

Does not collect serial numbers, machine UUIDs, usernames, or network addresses.
Does not evaluate ACPI/WMI methods or change drivers, services, or settings.
"""

import json
import platform
from pathlib import Path


def read(path):
    try:
        return Path(path).read_text().strip()
    except (OSError, UnicodeError):
        return None


def collect():
    result = {"kernel": platform.release()}
    for field in (
        "sys_vendor",
        "product_name",
        "board_name",
        "bios_version",
        "bios_date",
    ):
        result[field] = read("/sys/class/dmi/id/" + field)
    os_release = read("/etc/os-release") or ""
    result["os"] = {
        key: value.strip('"')
        for line in os_release.splitlines()
        if "=" in line
        for key, value in [line.split("=", 1)]
        if key in ("ID", "VERSION_ID", "BUILD_ID")
    }
    result["wmi_devices"] = sorted(
        path.name for path in Path("/sys/bus/wmi/devices").glob("*")
    )
    result["zotac_module_srcversion"] = read(
        "/sys/module/zotac_zone_platform/srcversion"
    )
    result["profiles"] = [
        {key: read(path / key) for key in ("name", "choices", "profile")}
        for path in sorted(Path("/sys/class/platform-profile").glob("*"))
    ]
    result["legacy_profile"] = read("/sys/firmware/acpi/platform_profile")
    result["firmware_attribute_providers"] = sorted(
        path.name for path in Path("/sys/class/firmware-attributes").glob("*")
    )
    return result


if __name__ == "__main__":
    print(json.dumps(collect(), indent=2))
