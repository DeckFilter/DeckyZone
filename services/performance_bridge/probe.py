"""Read-only sysfs report and narrowly gated, opt-in production backend."""

import platform
from pathlib import Path
import tomllib

from .sysfs import DRIVER, SysfsBackend, Unavailable
from .compatibility import check_environment, environment_status


WMI_GUID = "1f72b0f1-bfea-4472-9877-6e62937ab616"


def inspect(root: Path = Path("/")) -> dict:
    """Never load a module, call WMI, write sysfs, or change a service."""
    sysfs = root / "sys"
    blockers = []

    def read(path):
        try:
            return path.read_text().strip()
        except (OSError, UnicodeError):
            return None

    module = sysfs / "module" / DRIVER
    binding = sysfs / "bus/platform/drivers" / DRIVER / DRIVER
    wmi = [path.name for path in (sysfs / "bus/wmi/devices").glob("*")]
    report = {
        "available": False,
        "kernel": platform.release(),
        "dmi_vendor": read(sysfs / "class/dmi/id/sys_vendor"),
        "dmi_product": read(sysfs / "class/dmi/id/product_name"),
        "bios_version": read(sysfs / "class/dmi/id/bios_version"),
        "legacy_profile_present": (sysfs / "firmware/acpi/platform_profile").exists(),
        "module_loaded": module.exists(),
        "module_srcversion": read(module / "srcversion"),
        "driver_bound": binding.exists(),
        "wmi_devices": sorted(wmi),
        "required_wmi_present": any(
            name.lower().startswith(WMI_GUID + "-") for name in wmi
        ),
        "driver_validated": False,
        "ownership_verified": False,
        "blockers": blockers,
        "environment": environment_status(root),
    }
    if not report["module_loaded"]:
        blockers.append("module_missing")
    elif not report["driver_bound"]:
        blockers.append("driver_unbound")
    if not report["required_wmi_present"]:
        blockers.append("required_wmi_missing")
    try:
        backend = SysfsBackend(sysfs)
        snapshot = backend.read()
        report["sysfs"] = {
            "profile_path": str(backend.profile_dir),
            "profile": snapshot.profile,
            "cached_limits_watts": snapshot.limits,
            "tdp_min": backend.minimum,
            "tdp_max": backend.maximum,
        }
    except (OSError, ValueError, Unavailable) as error:
        blockers.append("sysfs_unavailable")
        report["sysfs_error"] = str(error)

    # The stock config needs an explicit --device-config service override.
    config_path = root / "usr/share/steamos-manager/devices/zotac-gaming-zone.toml"
    try:
        config = tomllib.loads(config_path.read_text())
        report["manager_tdp_method"] = config.get("tdp_limit", {}).get("method")
        report["manager_profile_driver"] = config.get("performance_profile", {}).get(
            "platform_profile_name"
        )
        if (
            report["manager_profile_driver"] == DRIVER
            or report["manager_tdp_method"] == "firmware_attribute"
        ):
            blockers.append("native_manager_backend_configured")
    except (OSError, ValueError, AttributeError) as error:
        report["manager_config_error"] = str(error)
        blockers.append("manager_configuration_unverified")

    # Presence is only a warning. Absence cannot prove that no writer is running.
    report["potential_decky_writers"] = [
        name
        for name in ("PowerControl", "SimpleDeckyTDP")
        if (root / "home/deck/homebrew/plugins" / name).exists()
    ]
    try:
        from .ryzenadj import power_plugin_status

        report["decky_power_plugins"] = power_plugin_status(root)
        report["powercontrol_disabled_in_decky"] = report["decky_power_plugins"][
            "PowerControl"
        ]["disabled_in_decky"]
    except (OSError, ValueError, Unavailable):
        report["decky_power_plugins"] = None
        report["powercontrol_disabled_in_decky"] = None
    blockers.extend(("driver_validation_pending", "exclusive_ownership_unverified"))
    report["kernel_backend"] = {"available": False, "blockers": list(blockers)}
    blockers.extend(report["environment"]["blockers"])
    marker = root / "etc/deckyzone/performance-enabled"
    report["opted_in"] = marker.is_file()
    if marker.is_file():
        from .ryzenadj import BINARY_SHA256, check_device, check_ownership
        import hashlib

        try:
            check_environment(root)
            check_device(root)
            check_ownership(root)
            binary = root / "var/lib/deckyzone-performance/bin/ryzenadj"
            if hashlib.sha256(binary.read_bytes()).hexdigest() != BINARY_SHA256:
                raise Unavailable("Validated RyzenAdj binary changed")
            override = tomllib.loads(
                (root / "etc/deckyzone/zone-performance.toml").read_text()
            )
            if (
                "performance_profile" in override
                or override["tdp_limit"]["method"] != "remote_interface"
            ):
                raise Unavailable("Manager override is incompatible")
            report.update(
                available=True,
                selected_backend="ryzenadj-0.18.0-g0a1w-bios1.20",
                state_kind="acknowledged_requests_not_hardware_readback",
                tdp_min=8,
                tdp_max=28,
                blockers=[],
            )
        except (OSError, ValueError, KeyError, Unavailable) as error:
            report["blockers"] = [str(error)]
    return report


def check_runtime(root=Path("/")):
    from .ryzenadj import check_ownership

    check_environment(root)
    check_ownership(root)


def production_controller():
    import fcntl
    import os

    from .controller import Controller
    from .ryzenadj import INSTALL, RyzenAdjBackend, check_device

    if os.geteuid() != 0 or not Path("/etc/deckyzone/performance-enabled").is_file():
        raise Unavailable(
            "Bridge unavailable: root and explicit device opt-in required"
        )
    check_runtime()
    check_device()
    lock = (INSTALL / "owner.lock").open("a")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        backend = RyzenAdjBackend()
        backend.initialize()
        controller = Controller(backend, check_runtime)
    except Exception:
        lock.close()
        raise
    controller.owner_lock = lock
    return controller
