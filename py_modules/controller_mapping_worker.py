"""Apply ZONE mappings through InputPlumber and the kernel trackpad device."""

import asyncio
import ctypes
import json
import os
import signal
import sys
import time

from evdev import InputDevice, ecodes
from pathlib import Path

from dbus_next import BusType, Message, MessageType
from dbus_next.aio import MessageBus

from controller_mapping_hid import CommandDevice, devices, event_path
from controller_mapping_output import MappingOutput
from controller_mappings import BUTTON_IDS, MARKERS, OUTPUTS, command_for, validate

DEST = "org.shadowblip.InputPlumber"
PATH = "/org/shadowblip/InputPlumber/CompositeDevice0"
IFACE = "org.shadowblip.Input.CompositeDevice"
PROPS = "org.freedesktop.DBus.Properties"


class Runtime:
    def __init__(self, directory):
        self.backup_path = Path(directory) / "controller-mapping-backup.json"
        self.bus = None
        self.command = None
        self.output = None
        self.mouse = None
        self.dbus_paths = set()
        self.mouse_motion = [0.0, 0.0]
        self.mouse_wheel = 0.0
        self.active = {}
        self.last = {}
        self.pulses = {}
        self.profile = None
        self.backup = None
        self.stop = asyncio.Event()
        self.queue = asyncio.Queue(maxsize=1024)
        self.error = None
        self.repeats = {}
        self.last_health_check = 0

    async def call(self, interface, member, signature="", body=None):
        reply = await asyncio.wait_for(
            self.bus.call(
                Message(
                    destination=DEST,
                    path=PATH,
                    interface=interface,
                    member=member,
                    signature=signature,
                    body=body or [],
                )
            ),
            3,
        )
        if reply.message_type == MessageType.ERROR:
            raise RuntimeError(f"InputPlumber {member}: {reply.body}")
        return reply.body

    async def send(self, cap, sig, value):
        self.output.send(cap, value)

    def save_backup(self):
        self.backup_path.parent.mkdir(parents=True, exist_ok=True)
        temporary = self.backup_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(self.backup))
        os.replace(temporary, self.backup_path)

    async def restore(self):
        if not self.backup_path.exists():
            return
        backup = json.loads(self.backup_path.read_text())
        for item in backup["mappings"]:
            original, applied = (
                bytes.fromhex(item["original"]),
                bytes.fromhex(item["applied"]),
            )
            current = self.command.read(original[0])
            if current == applied:
                self.command.write(original)
            elif current != original:
                raise RuntimeError(
                    "Trackpad mappings changed outside DeckyZone; original mappings are saved for recovery."
                )
        self.backup_path.unlink()

    async def setup(self, profile):
        paths = devices()
        self.command = CommandDevice(paths["03"])
        self.bus = await MessageBus(bus_type=BusType.SYSTEM).connect()
        await self.restore()
        if profile is None:
            return
        self.profile = validate(profile)
        self.output = MappingOutput()
        for _ in range(50):
            paths = (await self.call(PROPS, "Get", "ss", [IFACE, "SourceDevicePaths"]))[
                0
            ].value
            if self.output.path in paths:
                break
            await asyncio.sleep(0.1)
        else:
            raise RuntimeError("InputPlumber did not attach the mapping input source.")
        mappings = []
        for source, button in BUTTON_IDS.items():
            mode = profile["behaviors"][source.split("-")[0]]
            if mode == "default":
                continue
            original = self.command.read(button)
            applied = bytearray(14)
            applied[0] = button
            if mode == "directional_buttons":
                applied[7] = MARKERS[source]
            mappings.append(
                {"original": original.hex(), "applied": bytes(applied).hex()}
            )
        self.backup = {"mappings": mappings}
        self.save_backup()
        self.dbus_paths = set(
            (await self.call(PROPS, "Get", "ss", [IFACE, "DbusDevices"]))[0].value
        )
        self.bus.add_message_handler(self.input_event)
        match = "type='signal',sender='org.shadowblip.InputPlumber',interface='org.shadowblip.Input.DBusDevice',member='InputEvent'"
        reply = await self.bus.call(
            Message(
                destination="org.freedesktop.DBus",
                path="/org/freedesktop/DBus",
                interface="org.freedesktop.DBus",
                member="AddMatch",
                signature="s",
                body=[match],
            )
        )
        if reply.message_type == MessageType.ERROR:
            raise RuntimeError("Could not subscribe to controller inputs.")
        if any(mode != "default" for mode in profile["behaviors"].values()):
            self.mouse = InputDevice(event_path("ZOTAC Gaming Zone Mouse"))
            self.mouse.grab()
        for item in mappings:
            self.command.write(bytes.fromhex(item["applied"]))
        targets = (await self.call(PROPS, "Get", "ss", [IFACE, "TargetCapabilities"]))[
            0
        ].value
        required = {OUTPUTS[c][0] for c in profile["bindings"].values() if c}
        if self.mouse is not None:
            required.update(
                (
                    "Mouse:Motion",
                    "Mouse:Wheel",
                    "Mouse:Button:Left",
                    "Mouse:Button:Right",
                )
            )
        missing = required - set(targets)
        if missing:
            raise RuntimeError(
                "InputPlumber cannot output: " + ", ".join(sorted(missing))
            )

    async def flush(self):
        desired = {}
        for command in self.active.values():
            if not command:
                continue
            cap, sig, value = OUTPUTS[command]
            if cap in ("Mouse:Motion", "Mouse:Wheel"):
                continue
            if sig == "ad":
                old = desired.get(cap, (sig, [0.0, 0.0]))[1]
                value = [a + b for a, b in zip(old, value)]
            desired[cap] = (sig, value)
        desired = {
            cap: (
                sig,
                [max(-1.0, min(1.0, v)) for v in value] if sig == "ad" else value,
            )
            for cap, (sig, value) in desired.items()
        }
        for cap in self.last.keys() | desired.keys():
            sig, previous = self.last.get(cap, desired.get(cap))
            value = desired.get(
                cap, (sig, False if sig == "b" else 0.0 if sig == "d" else [0.0, 0.0])
            )[1]
            if cap not in self.last or value != previous:
                await self.send(cap, sig, value)
        self.last = desired

    def input_event(self, message):
        if (
            message.message_type != MessageType.SIGNAL
            or message.path not in self.dbus_paths
            or message.interface != "org.shadowblip.Input.DBusDevice"
            or message.member != "InputEvent"
        ):
            return
        action, value = message.body
        if action.startswith("deckyzone:"):
            self.enqueue((action.removeprefix("deckyzone:"), value))

    def enqueue(self, event):
        try:
            self.queue.put_nowait(event)
        except asyncio.QueueFull:
            self.error = RuntimeError("Controller input queue overflowed.")
            self.stop.set()

    async def event(self, source, value):
        if source in ("left-dial", "right-dial"):
            if not value:
                return
            source += "-clockwise" if value > 0 else "-counterclockwise"
            command = command_for(self.profile, source)
            if command and command.startswith("system:brightness-"):
                print(json.dumps({"brightness": command.rsplit("-", 1)[1]}), flush=True)
                return
            if source in self.active:
                self.active.pop(source)
                await self.flush()
            self.active[source] = command
            self.repeats.pop(source, None)
            self.pulses[source] = time.monotonic() + 0.04
        elif source in MARKERS:
            if self.profile["behaviors"][source.split("-")[0]] != "directional_buttons":
                return
            if value:
                self.active[source] = command_for(self.profile, source)
            else:
                self.active.pop(source, None)
        elif source == "mouse":
            await self.mouse_event(value)
        await self.flush()

    async def mouse_event(self, event):
        if event.type == ecodes.EV_SYN:
            if event.code == ecodes.SYN_DROPPED:
                raise RuntimeError("Trackpad input overflowed; restarting mappings.")
            if event.code == ecodes.SYN_REPORT:
                if self.profile["behaviors"]["right"] == "default" and any(
                    self.mouse_motion
                ):
                    await self.send("Mouse:Motion", "ad", self.mouse_motion)
                if self.profile["behaviors"]["left"] == "default" and self.mouse_wheel:
                    await self.send("Mouse:Wheel", "ad", [0.0, self.mouse_wheel])
                self.mouse_motion = [0.0, 0.0]
                self.mouse_wheel = 0.0
        elif event.type == ecodes.EV_REL:
            if event.code in (ecodes.REL_X, ecodes.REL_Y):
                self.mouse_motion[event.code == ecodes.REL_Y] += event.value
            elif event.code == ecodes.REL_WHEEL:
                self.mouse_wheel += event.value
        elif (
            event.type == ecodes.EV_KEY
            and self.profile["behaviors"]["right"] == "default"
        ):
            command = {
                ecodes.BTN_LEFT: "mouse:left",
                ecodes.BTN_RIGHT: "mouse:right",
                ecodes.BTN_MIDDLE: "mouse:middle",
            }.get(event.code)
            if command:
                if event.value:
                    self.active["native-" + command] = command
                else:
                    self.active.pop("native-" + command, None)

    async def tick(self, now):
        for source, deadline in list(self.pulses.items()):
            if deadline <= now:
                self.pulses.pop(source)
                self.active.pop(source, None)
        await self.flush()
        for source in list(self.repeats):
            if source not in self.active:
                self.repeats.pop(source)
        for source, command in self.active.items():
            if not command:
                continue
            cap, sig, value = OUTPUTS[command]
            if cap not in ("Mouse:Motion", "Mouse:Wheel") or now < self.repeats.get(
                source, 0
            ):
                continue
            await self.send(cap, sig, value)
            self.repeats[source] = now + (0.12 if cap == "Mouse:Wheel" else 0.02)

    def read_mouse(self):
        try:
            for event in self.mouse.read():
                self.enqueue(("mouse", event))
        except BlockingIOError:
            pass
        except Exception as error:
            self.error = error
            self.stop.set()

    async def run(self):
        loop = asyncio.get_running_loop()
        if self.mouse is not None:
            loop.add_reader(self.mouse.fd, self.read_mouse)
        try:
            while not self.stop.is_set():
                try:
                    event = await asyncio.wait_for(self.queue.get(), 0.02)
                except asyncio.TimeoutError:
                    event = None
                if event is not None:
                    await self.event(*event)
                now = time.monotonic()
                await self.tick(now)
                if now - self.last_health_check >= 1:
                    paths = set(
                        (await self.call(PROPS, "Get", "ss", [IFACE, "DbusDevices"]))[
                            0
                        ].value
                    )
                    profile_yaml = (await self.call(IFACE, "GetProfileYaml"))[0]
                    sources = (
                        await self.call(
                            PROPS, "Get", "ss", [IFACE, "SourceDevicePaths"]
                        )
                    )[0].value
                    if (
                        paths != self.dbus_paths
                        or "DeckyZone mapping left-dial" not in profile_yaml
                        or self.output.path not in sources
                    ):
                        raise RuntimeError(
                            "InputPlumber restarted; reconnecting mappings."
                        )
                    self.last_health_check = now
            if self.error:
                raise self.error
        finally:
            if self.mouse is not None:
                loop.remove_reader(self.mouse.fd)

    async def close(self):
        self.active.clear()
        try:
            if self.bus is not None:
                try:
                    await self.flush()
                finally:
                    await self.restore()
        finally:
            try:
                if self.output is not None:
                    await asyncio.sleep(0.03)
                    self.output.close()
            finally:
                if self.mouse is not None:
                    self.mouse.close()
                if self.bus:
                    self.bus.disconnect()


async def main():
    parent = os.getppid()
    runtime = Runtime(sys.argv[1])
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, runtime.stop.set)
    ctypes.CDLL(None).prctl(1, signal.SIGTERM)
    if os.getppid() != parent:
        return
    profile = json.loads(sys.stdin.readline())
    try:
        await runtime.setup(profile)
        print(json.dumps({"ready": True}), flush=True)
        if profile is not None:
            await runtime.run()
    finally:
        await runtime.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as error:
        print(json.dumps({"error": str(error)}), flush=True)
        raise SystemExit(1)
