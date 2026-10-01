"""Feed mapped events into InputPlumber's normal evdev source pipeline."""

from evdev import AbsInfo, UInput, ecodes

from controller_mappings import OUTPUTS, DEVICE_NAME

BUTTONS = {
    "South": "BTN_SOUTH",
    "East": "BTN_EAST",
    "West": "BTN_WEST",
    "North": "BTN_NORTH",
    "LeftBumper": "BTN_TL",
    "RightBumper": "BTN_TR",
    "Select": "BTN_SELECT",
    "Start": "BTN_START",
    "LeftStick": "BTN_THUMBL",
    "RightStick": "BTN_THUMBR",
    **{"DPad" + d: "BTN_DPAD_" + d.upper() for d in ("Up", "Down", "Left", "Right")},
}
MOUSE_BUTTONS = {
    "Left": "BTN_LEFT",
    "Right": "BTN_RIGHT",
    "Middle": "BTN_MIDDLE",
    "Extra2": "BTN_SIDE",
    "Extra1": "BTN_EXTRA",
}
AXES = {
    "LeftStick": (ecodes.ABS_X, ecodes.ABS_Y),
    "RightStick": (ecodes.ABS_RX, ecodes.ABS_RY),
}
TRIGGERS = {"LeftTrigger": ecodes.ABS_Z, "RightTrigger": ecodes.ABS_RZ}


def key_code(capability):
    parts = capability.split(":")
    if parts[0] == "Keyboard":
        return getattr(ecodes, "KEY_" + parts[-1].removeprefix("Key").upper())
    names = BUTTONS if parts[0] == "Gamepad" else MOUSE_BUTTONS
    return getattr(ecodes, names[parts[-1]])


class MappingOutput:
    def __init__(self):
        keys = {
            key_code(cap) for cap, signature, _ in OUTPUTS.values() if signature == "b"
        }
        axes = [
            (axis, AbsInfo(0, -1, 1, 0, 0, 0))
            for pair in AXES.values()
            for axis in pair
        ]
        axes.extend((axis, AbsInfo(0, 0, 1, 0, 0, 0)) for axis in TRIGGERS.values())
        # InputPlumber accepts virtual Bluetooth sources; other virtual buses are ignored.
        self.device = UInput(
            {
                ecodes.EV_KEY: sorted(keys),
                ecodes.EV_ABS: axes,
                ecodes.EV_REL: [
                    ecodes.REL_X,
                    ecodes.REL_Y,
                    ecodes.REL_WHEEL,
                    ecodes.REL_HWHEEL,
                ],
            },
            name=DEVICE_NAME,
            vendor=0x1EE9,
            product=0xD001,
            bustype=ecodes.BUS_BLUETOOTH,
        )
        self.path = self.device.device.path

    def send(self, capability, value):
        parts = capability.split(":")
        if parts[0] == "Keyboard" or parts[1] == "Button":
            self.device.write(ecodes.EV_KEY, key_code(capability), int(value))
        elif parts[1] == "Axis":
            for axis, component in zip(AXES[parts[-1]], value):
                self.device.write(ecodes.EV_ABS, axis, round(component))
        elif parts[1] == "Trigger":
            self.device.write(ecodes.EV_ABS, TRIGGERS[parts[-1]], round(value))
        else:
            codes = (
                (ecodes.REL_X, ecodes.REL_Y)
                if parts[-1] == "Motion"
                else (ecodes.REL_HWHEEL, ecodes.REL_WHEEL)
            )
            for code, component in zip(codes, value):
                if component:
                    self.device.write(ecodes.EV_REL, code, round(component))
        self.device.syn()

    def close(self):
        self.device.close()
