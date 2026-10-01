from pathlib import Path


STARTUP_TARGET_GAMEPAD_DEVICE_NAMES = frozenset(
    {
        "Valve Steam Deck Controller",
        "Steam Controller",
        "Zone Controller",
    }
)
STARTUP_TARGET_GAMEPAD_DEVICE_PREFIXES = ("Microsoft X-Box 360 pad",)
MISSING_GLYPH_FIX_TARGET_MODE = "xbox-elite"
MISSING_GLYPH_FIX_TARGET_GAMEPAD_DEVICE_NAMES = frozenset(
    {
        "Microsoft X-Box One Elite pad",
    }
)

STEAM_UHID_TARGET_MODE = "deck-uhid"
STEAM_UHID_DEVICE_NAMES = {
    0x1205: frozenset({"Steam Controller"}),
    0x12F0: frozenset({"Generic Steam Controller", "Steam Controller"}),
    0x12FC: frozenset({"Zone Controller"}),
    0x12FF: frozenset({"Legion Go S Controller"}),
}


def is_virtual_gamepad_event_device(
    device_path,
    input_root=Path("/sys/class/input"),
    virtual_root=Path("/sys/devices/virtual"),
):
    try:
        path = Path(device_path)
        device = (Path(input_root) / path.name / "device").resolve(strict=True)
        return path.is_char_device() and Path(virtual_root).resolve() in device.parents
    except OSError:
        return False


def resolve_steam_uhid_device_path(
    hidraw_root=Path("/sys/class/hidraw"),
    device_root=Path("/dev"),
    uhid_root=Path("/sys/devices/virtual/misc/uhid"),
):
    for candidate in sorted(Path(hidraw_root).glob("hidraw*")):
        try:
            device = (candidate / "device").resolve(strict=True)
            if Path(uhid_root).resolve() not in device.parents:
                continue
            properties = dict(
                line.split("=", 1)
                for line in (device / "uevent").read_text().splitlines()
                if "=" in line
            )
            bus, vendor, product = (
                int(value, 16) for value in properties.get("HID_ID", "").split(":")
            )
            names = STEAM_UHID_DEVICE_NAMES.get(product, ())
            if bus != 0x03 or vendor != 0x28DE or properties.get("HID_NAME") not in names:
                continue
            path = Path(device_root) / candidate.name
            if path.is_char_device():
                return str(path)
        except (OSError, ValueError):
            continue
    return None


def build_target_devices(target_mode, include_keyboard=True, include_mouse=True):
    targets = [str(target_mode)]
    if include_keyboard:
        targets.append("keyboard")
    if include_mouse:
        targets.append("mouse")
    return targets


def build_target_devices_busctl_args(target_mode, include_keyboard=True, include_mouse=True):
    targets = build_target_devices(
        target_mode,
        include_keyboard=include_keyboard,
        include_mouse=include_mouse,
    )
    return [str(len(targets)), *targets]


def is_startup_target_gamepad_device_name(device_name):
    if not device_name:
        return False

    if device_name in STARTUP_TARGET_GAMEPAD_DEVICE_NAMES:
        return True

    return any(
        device_name.startswith(prefix)
        for prefix in STARTUP_TARGET_GAMEPAD_DEVICE_PREFIXES
    )


def describe_startup_target_gamepad_names():
    exact_names = ", ".join(sorted(STARTUP_TARGET_GAMEPAD_DEVICE_NAMES))
    prefix_names = ", ".join(
        f"{prefix}*" for prefix in STARTUP_TARGET_GAMEPAD_DEVICE_PREFIXES
    )
    return ", ".join(part for part in (exact_names, prefix_names) if part)


def is_target_gamepad_device_name(target_mode, device_name):
    if target_mode == MISSING_GLYPH_FIX_TARGET_MODE:
        return device_name in MISSING_GLYPH_FIX_TARGET_GAMEPAD_DEVICE_NAMES

    return is_startup_target_gamepad_device_name(device_name)
