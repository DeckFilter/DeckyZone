"""Validated mapping profiles and InputPlumber output commands."""

import copy
import re
from pathlib import Path

SIDES = ("left", "right")
DIRECTIONS = ("up", "down", "left", "right")
SOURCES = tuple(
    f"{s}-dial-{d}" for s in SIDES for d in ("counterclockwise", "clockwise")
) + tuple(f"{s}-trackpad-{d}" for s in SIDES for d in DIRECTIONS)
MARKERS = dict(zip(SOURCES[4:], (0x68, 0x69, 0x6A, 0x6F, 0x70, 0x71, 0x72, 0x73)))
MARKER_CAPS = dict(
    zip(SOURCES[4:], (f"Keyboard:KeyF{n}" for n in (13, 14, 15, 20, 21, 22, 23, 24)))
)
BUTTON_IDS = dict(zip(SOURCES[4:], range(3, 11)))
DIAL_DEFAULTS = dict(
    zip(
        SOURCES[:4],
        (
            "system:volume-down",
            "system:volume-up",
            "system:brightness-down",
            "system:brightness-up",
        ),
    )
)
OUTPUTS = {}


def _add(command, cap, signature="b", value=True):
    OUTPUTS[command] = (cap, signature, value)


for name, target in dict(
    a="South",
    b="East",
    x="West",
    y="North",
    lb="LeftBumper",
    rb="RightBumper",
    select="Select",
    start="Start",
).items():
    _add("gamepad:" + name, "Gamepad:Button:" + target)
for side in SIDES:
    title = side.title()
    _add(f"gamepad:{side}-stick-click", f"Gamepad:Button:{title}Stick")
    _add(
        "gamepad:" + ("lt" if side == "left" else "rt"),
        f"Gamepad:Trigger:{title}Trigger",
        "d",
        1.0,
    )
    for direction, vector in zip(
        DIRECTIONS, ([0.0, -1.0], [0.0, 1.0], [-1.0, 0.0], [1.0, 0.0])
    ):
        _add(
            f"gamepad:{side}-stick-{direction}",
            f"Gamepad:Axis:{title}Stick",
            "ad",
            vector,
        )
for direction in DIRECTIONS:
    _add("gamepad:dpad-" + direction, "Gamepad:Button:DPad" + direction.title())
for name, target in dict(
    left="Left", right="Right", middle="Middle", back="Extra2", forward="Extra1"
).items():
    _add("mouse:" + name, "Mouse:Button:" + target)
for direction, vector in zip(
    DIRECTIONS, ([0.0, -1.0], [0.0, 1.0], [-1.0, 0.0], [1.0, 0.0])
):
    _add("mouse:move-" + direction, "Mouse:Motion", "ad", [v * 8 for v in vector])
    _add("mouse:wheel-" + direction, "Mouse:Wheel", "ad", [vector[0], -vector[1]])
for letter in "ABCDEFGHIJKLMNOPQRSTUVWXYZ":
    _add("keyboard:Key" + letter, "Keyboard:Key" + letter)
for n in range(10):
    _add(f"keyboard:Digit{n}", f"Keyboard:Key{n}")
for n in range(1, 13):
    _add(f"keyboard:F{n}", f"Keyboard:KeyF{n}")
KEYS = dict(
    Escape="Esc",
    Backquote="Grave",
    Minus="Minus",
    Equal="Equal",
    Backspace="Backspace",
    Tab="Tab",
    BracketLeft="LeftBrace",
    BracketRight="RightBrace",
    Backslash="Backslash",
    CapsLock="Capslock",
    Semicolon="Semicolon",
    Quote="Apostrophe",
    Enter="Enter",
    ShiftLeft="LeftShift",
    ShiftRight="RightShift",
    Comma="Comma",
    Period="Dot",
    Slash="Slash",
    ControlLeft="LeftCtrl",
    MetaLeft="LeftMeta",
    AltLeft="LeftAlt",
    Space="Space",
    AltRight="RightAlt",
    ControlRight="RightCtrl",
)
for name, key in KEYS.items():
    _add("keyboard:" + name, "Keyboard:Key" + key)
for name in (
    "Insert",
    "Home",
    "PageUp",
    "Delete",
    "End",
    "PageDown",
    "ArrowUp",
    "ArrowLeft",
    "ArrowDown",
    "ArrowRight",
):
    _add("numpad:" + name, "Keyboard:Key" + name.removeprefix("Arrow"))
for n in range(10):
    _add(f"numpad:Numpad{n}", f"Keyboard:KeyKp{n}")
for name, key in dict(
    NumLock="Numlock",
    NumpadDivide="KpSlash",
    NumpadMultiply="KpAsterisk",
    NumpadSubtract="KpMinus",
    NumpadAdd="KpPlus",
    NumpadEnter="KpEnter",
    NumpadDecimal="KpDot",
).items():
    _add("numpad:" + name, "Keyboard:Key" + key)
PUBLIC_COMMANDS = frozenset(OUTPUTS)
for name, key in zip(
    DIAL_DEFAULTS.values(), ("VolumeDown", "VolumeUp", "BrightnessDown", "BrightnessUp")
):
    _add(name, "Keyboard:Key" + key)


def app_id(value):
    value = str(value)
    if not re.fullmatch(r"0|[1-9][0-9]{0,9}", value) or int(value) > 0xFFFFFFFF:
        raise ValueError("Invalid game ID.")
    return value


def defaults(mode="default"):
    behaviors = {side: mode for side in SIDES}
    bindings = {}
    if mode == "directional_buttons":
        targets = ["gamepad:dpad-" + d for d in DIRECTIONS] + [
            "gamepad:y",
            "gamepad:a",
            "gamepad:x",
            "gamepad:b",
        ]
        bindings.update(zip(SOURCES[4:], targets))
    return {
        "buttons": {"home": "screenshot"},
        "behaviors": behaviors,
        "dials": {"left": "volume", "right": "brightness"},
        "bindings": bindings,
    }


def validate(profile):
    required = {"behaviors", "dials", "bindings"}
    if (
        not isinstance(profile, dict)
        or not required <= set(profile) <= required | {"buttons"}
    ):
        raise ValueError("Invalid controller mapping profile.")
    if "buttons" in profile:
        buttons = profile["buttons"]
        if (
            not isinstance(buttons, dict)
            or set(buttons) != {"home"}
            or buttons["home"] not in ("screenshot", "steam_home")
        ):
            raise ValueError("Invalid Home button action.")
    dials = profile["dials"]
    if (
        not isinstance(dials, dict)
        or set(dials) != set(SIDES)
        or any(v not in ("volume", "brightness", "custom") for v in dials.values())
    ):
        raise ValueError("Invalid dial behavior.")
    behaviors, bindings = profile["behaviors"], profile["bindings"]
    if (
        not isinstance(behaviors, dict)
        or set(behaviors) != set(SIDES)
        or any(
            v not in ("default", "disabled", "directional_buttons")
            for v in behaviors.values()
        )
    ):
        raise ValueError("Invalid trackpad behavior.")
    if not isinstance(bindings, dict) or any(
        k not in SOURCES
        or (v is not None and (not isinstance(v, str) or v not in PUBLIC_COMMANDS))
        for k, v in bindings.items()
    ):
        raise ValueError("Invalid controller command.")
    return copy.deepcopy(profile)


def normalize(profile):
    try:
        return validate(profile)
    except (ValueError, TypeError):
        return None


def command_for(profile, source):
    if "-dial-" in source:
        mode = profile["dials"][source.split("-")[0]]
        if mode != "custom":
            return (
                "system:"
                + mode
                + ("-down" if source.endswith("-counterclockwise") else "-up")
            )
    return profile["bindings"].get(source)


def input_profile(profile_yaml, profile):
    import runtime_profile_utils

    sources = [
        (f"{side}-dial", ["gamepad:", "  dial:", f"    name: {side.title()}StickDial"])
        for side in SIDES
    ]
    patterns = [re.compile(r"name: (Left|Right)StickDial\b")]
    for source, cap in MARKER_CAPS.items():
        if profile["behaviors"][source.split("-")[0]] == "directional_buttons":
            key = cap.split(":")[1]
            sources.append((source, [f"keyboard: {key}"]))
            patterns.append(re.compile(r"keyboard: " + key + r"\b"))
    cleaned = runtime_profile_utils.remove_mapping_sources(profile_yaml, patterns)
    original, prefix, suffix, blocks = runtime_profile_utils._split_mapping_blocks(
        cleaned
    )
    if prefix is None:
        prefix, suffix, blocks = cleaned.splitlines() + ["mapping:"], [], []
    indent = (
        blocks[0][0][: len(blocks[0][0]) - len(blocks[0][0].lstrip())]
        if blocks
        else "  "
    )
    for source, config in sources:
        blocks.append(
            [
                indent + "- name: DeckyZone mapping " + source,
                indent + "  source_event:",
                *[indent + "    " + line for line in config],
                indent + "  target_events:",
                indent
                + "    - dbus: "
                + ("none" if source.endswith("-dial") else "deckyzone:" + source),
            ]
        )
    return runtime_profile_utils._join_mapping_blocks(
        original, prefix, suffix, blocks
    ) + ("\n" if not original.endswith("\n") else "")


DEVICE_NAME = "DeckyZone Mapping Output"
SOURCE_FILENAME = "49-deckyzone-mappings.yaml"
OUTPUT_MAP_FILENAME = "49-deckyzone-mapping-output.yaml"
SOURCE_MARKER = "# Managed by DeckyZone: custom controller mapping source"


def sync_source_file(directory, system_profile, enabled):
    directory = Path(directory)
    destination = directory / SOURCE_FILENAME
    capabilities = directory.parent / "capability_maps.d" / SOURCE_FILENAME
    output_map = capabilities.with_name(OUTPUT_MAP_FILENAME)
    existing = {}
    for path in (destination, capabilities, output_map):
        content = path.read_text() if path.exists() else None
        if content is not None and not content.startswith(SOURCE_MARKER + "\n"):
            raise RuntimeError(
                "The DeckyZone mapping source file is owned by another configuration."
            )
        existing[path] = content
    if not enabled:
        for path in existing:
            path.unlink(missing_ok=True)
        return any(content is not None for content in existing.values())
    base = directory / Path(system_profile).name
    profile = (base if base.exists() else Path(system_profile)).read_text()
    if (
        profile.count("\nsource_devices:\n") != 1
        or "capability_map_id: zone1" not in profile
    ):
        raise RuntimeError("Could not locate the ZONE input sources.")
    source = (
        "source_devices:\n"
        "  - group: deckyzone-mappings\n"
        "    capability_map_id: deckyzone-mapping-output\n"
        "    evdev:\n"
        f"      name: {DEVICE_NAME}\n"
        '      vendor_id: "1ee9"\n'
        '      product_id: "d001"\n'
        "      handler: event*\n"
    )
    profile = profile.replace("source_devices:\n", source, 1).replace(
        "capability_map_id: zone1", "capability_map_id: deckyzone-mappings"
    )
    stock_map = (
        Path(system_profile).parent.parent / "capability_maps" / "zone_type1.yaml"
    )
    custom_map = directory.parent / "capability_maps.d" / stock_map.name
    capability_map = (custom_map if custom_map.exists() else stock_map).read_text()
    if (
        not re.search(r"(?m)^id: zone1$", capability_map)
        or capability_map.count("\nmapping:\n") != 1
    ):
        raise RuntimeError("Could not locate the ZONE dial capability map.")
    capability_map = re.sub(
        r"(?m)^id: zone1$", "id: deckyzone-mappings", capability_map
    )
    indent = re.search(r"(?m)^( +)- name:", capability_map).group(1)
    additions = []
    for side, axis in (("left", "REL_HWHEEL"), ("right", "REL_WHEEL")):
        additions.extend(
            [
                indent + "- name: DeckyZone " + side + " dial signal",
                indent + "  source_events:",
                indent + "    - evdev:",
                indent + "        event_type: REL",
                indent + "        event_code: " + axis,
                indent + "        value_type: trigger",
                indent + "  target_event:",
                indent + "    dbus: deckyzone:" + side + "-dial",
            ]
        )
    capability_map = capability_map.replace(
        "mapping:\n", "mapping:\n" + "\n".join(additions) + "\n", 1
    )
    output_lines = [
        "version: 2",
        "kind: CapabilityMap",
        "name: DeckyZone mapping output",
        "id: deckyzone-mapping-output",
        "mapping:",
    ]
    for direction in DIRECTIONS:
        output_lines.extend(
            [
                "  - name: D-pad " + direction,
                "    source_events:",
                "      - evdev:",
                "          event_type: KEY",
                "          event_code: BTN_DPAD_" + direction.upper(),
                "          value_type: button",
                "    target_event:",
                "      gamepad:",
                "        button: DPad" + direction.title(),
            ]
        )
    for code, axis in (("REL_HWHEEL", "x"), ("REL_WHEEL", "y")):
        output_lines.extend(
            [
                "  - name: Wheel " + axis,
                "    source_events:",
                "      - evdev:",
                "          event_type: REL",
                "          event_code: " + code,
                "          value_type: joystick_" + axis,
                "    target_event:",
                "      mouse:",
                "        wheel: {}",
            ]
        )
    changed = False
    for path, content in (
        (capabilities, capability_map),
        (output_map, "\n".join(output_lines) + "\n"),
        (destination, profile),
    ):
        updated = SOURCE_MARKER + "\n" + content
        if updated == existing[path]:
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        temporary = path.with_suffix(".tmp")
        temporary.write_text(updated)
        temporary.replace(path)
        changed = True
    return changed
