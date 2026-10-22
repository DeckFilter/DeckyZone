"""Wake the provider for power/lifecycle events and Decky ownership changes."""

import asyncio
import ctypes
import logging
import os
from pathlib import Path
import struct

from dbus_next import Message, MessageType

from .ryzenadj import POWER_PLUGINS
from .sysfs import Unavailable


LOG = logging.getLogger(__name__)
DBUS = "org.freedesktop.DBus"
DBUS_PATH = "/org/freedesktop/DBus"
LOGIN = "org.freedesktop.login1"
LOGIN_PATH = "/org/freedesktop/login1"
LOGIN_MANAGER = LOGIN + ".Manager"
UPOWER = "org.freedesktop.UPower"
UPOWER_PATH = "/org/freedesktop/UPower"
PROPERTIES = "org.freedesktop.DBus.Properties"


class RuntimeEvents:
    def __init__(self, bus, controller, root=Path("/")):
        self.bus = bus
        self.controller = controller
        self.root = root
        self.changed = asyncio.Event()
        self.error = None
        self.sleeping = False
        self.shutting_down = False
        self.lifecycle_revision = 0
        self.owners = {}
        self.watcher = None

    @property
    def preparing(self):
        return self.sleeping or self.shutting_down

    async def _call(self, **kwargs):
        reply = await asyncio.wait_for(self.bus.call(Message(**kwargs)), timeout=2)
        if reply.message_type == MessageType.ERROR:
            raise Unavailable(f"Cannot subscribe to power events: {reply.error_name}")
        return reply

    async def _match(self, rule):
        await self._call(destination=DBUS, path=DBUS_PATH, interface=DBUS,
                         member="AddMatch", signature="s", body=[rule])

    def _prepare(self):
        # threading.Event is also checked between individual RyzenAdj commands.
        if self.preparing:
            self.controller.preparing.set()
        else:
            self.controller.preparing.clear()
        self.changed.set()

    def _signal(self, message):
        if message.message_type != MessageType.SIGNAL:
            return
        if (message.sender == DBUS and message.interface == DBUS
                and message.path == DBUS_PATH and message.member == "NameOwnerChanged"
                and len(message.body) == 3 and message.body[0] in self.owners):
            name, before, after = message.body
            if before == self.owners[name] and after != before:
                if name == LOGIN:
                    self.controller.preparing.set()
                    self.error = "Lost the service used for sleep/shutdown protection"
                else:
                    self.owners.pop(UPOWER, None)
                    LOG.warning("UPower changed owner; using power-source fallback")
                self.changed.set()
            return
        if (message.sender == self.owners.get(LOGIN)
                and message.interface == LOGIN_MANAGER and message.path == LOGIN_PATH
                and message.member in ("PrepareForSleep", "PrepareForShutdown")
                and len(message.body) == 1 and type(message.body[0]) is bool):
            self.lifecycle_revision += 1
            preparing = message.body[0]
            if message.member == "PrepareForSleep":
                if self.sleeping and not preparing:
                    self.controller.restore_pending.set()
                self.sleeping = preparing
            else:
                self.shutting_down = preparing
            self._prepare()
        elif (message.sender == self.owners.get(UPOWER)
                and message.interface == PROPERTIES and message.path == UPOWER_PATH
                and message.member == "PropertiesChanged" and len(message.body) == 3
                and message.body[0] == UPOWER
                and ("OnBattery" in message.body[1] or "OnBattery" in message.body[2])):
            self.changed.set()

    async def start(self):
        self.bus.add_message_handler(self._signal)
        for name in (LOGIN, UPOWER):
            try:
                owner = await self._call(destination=DBUS, path=DBUS_PATH,
                                         interface=DBUS, member="GetNameOwner",
                                         signature="s", body=[name])
                self.owners[name] = owner.body[0]
                await self._match(
                    f"type='signal',sender='{DBUS}',interface='{DBUS}',"
                    f"path='{DBUS_PATH}',member='NameOwnerChanged',arg0='{name}'")
                if name == LOGIN:
                    await self._match(f"type='signal',sender='{LOGIN}',"
                                      f"interface='{LOGIN_MANAGER}',path='{LOGIN_PATH}'")
                else:
                    await self._match(f"type='signal',sender='{UPOWER}',"
                                      f"interface='{PROPERTIES}',path='{UPOWER_PATH}'")
            except (OSError, Unavailable, asyncio.TimeoutError):
                if name == LOGIN:
                    raise
                self.owners.pop(UPOWER, None)
                LOG.warning("UPower events unavailable; using power-source fallback")
        revision = self.lifecycle_revision
        state = await self._call(destination=LOGIN, path=LOGIN_PATH,
                                 interface=PROPERTIES, member="GetAll", signature="s",
                                 body=[LOGIN_MANAGER])
        if revision == self.lifecycle_revision:
            self.sleeping = bool(state.body[0]["PreparingForSleep"].value)
            self.shutting_down = bool(state.body[0]["PreparingForShutdown"].value)
        owner = await self._call(destination=DBUS, path=DBUS_PATH, interface=DBUS,
                                 member="GetNameOwner", signature="s", body=[LOGIN])
        if owner.body[0] != self.owners[LOGIN] or self.error:
            raise Unavailable("Sleep/shutdown event source changed during startup")
        self._prepare()
        self._watch_decky()

    def _watch_decky(self):
        # Watch directories rather than loader.json's inode: Decky may replace it
        # atomically, and plugin installs/removals change ownership independently.
        library = ctypes.CDLL(None, use_errno=True)
        try:
            descriptor = library.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
            if descriptor < 0:
                raise OSError(ctypes.get_errno(), "inotify_init1")
            self.watcher = descriptor
            self.watches = {}
            mask = 0x8 | 0x40 | 0x80 | 0x100 | 0x200 | 0x400 | 0x800
            for kind, suffix in (("settings", "settings"), ("plugins", "plugins")):
                path = self.root / "home/deck/homebrew" / suffix
                watch = library.inotify_add_watch(descriptor, os.fsencode(path), mask)
                if watch < 0:
                    raise OSError(ctypes.get_errno(), "inotify_add_watch")
                self.watches[watch] = kind
            asyncio.get_running_loop().add_reader(descriptor, self._decky_changed)
        except (AttributeError, OSError):
            self._close_watcher()
            LOG.warning("Decky file events unavailable; using ownership fallback")

    def _decky_changed(self):
        try:
            data = os.read(self.watcher, 65536)
            offset = 0
            while offset + 16 <= len(data):
                watch, mask, _, length = struct.unpack_from("iIII", data, offset)
                name = data[offset + 16:offset + 16 + length].split(b"\0", 1)[0]
                offset += 16 + length
                kind = self.watches.get(watch)
                if (mask & (0x4000 | 0x8000 | 0x400 | 0x800)
                        or (kind == "settings" and name == b"loader.json")
                        or (kind == "plugins" and name.decode(errors="replace") in POWER_PLUGINS)):
                    self.changed.set()
                if mask & (0x8000 | 0x400 | 0x800):
                    self._close_watcher()
                    LOG.warning("Decky file watch lost; using ownership fallback")
                    break
        except BlockingIOError:
            pass
        except OSError:
            self._close_watcher()
            self.changed.set()

    def _close_watcher(self):
        if self.watcher is not None:
            asyncio.get_running_loop().remove_reader(self.watcher)
            os.close(self.watcher)
            self.watcher = None

    def close(self):
        self._close_watcher()
        self.bus.remove_message_handler(self._signal)
