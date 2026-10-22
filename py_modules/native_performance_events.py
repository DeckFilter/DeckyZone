"""Invalidate the native-control UI when its service or Decky conflicts change."""

import asyncio
import ctypes
import json
import os
from pathlib import Path
import struct


EVENT = "native_performance_status_changed"
SYSTEMD = "org.freedesktop.systemd1"
SYSTEMD_PATH = "/org/freedesktop/systemd1"
MANAGER = SYSTEMD + ".Manager"
UNIT_PATH = SYSTEMD_PATH + "/unit/deckyzone_2dperformance_2eservice"
PROPERTIES = "org.freedesktop.DBus.Properties"
DBUS = "org.freedesktop.DBus"
DBUS_PATH = "/org/freedesktop/DBus"
POWER_PLUGINS = ("PowerControl", "SimpleDeckyTDP")

IN_CLOSE_WRITE = 0x00000008
IN_MOVED_FROM = 0x00000040
IN_MOVED_TO = 0x00000080
IN_CREATE = 0x00000100
IN_DELETE = 0x00000200
IN_DELETE_SELF = 0x00000400
IN_MOVE_SELF = 0x00000800
IN_Q_OVERFLOW = 0x00004000
IN_IGNORED = 0x00008000
DIRECTORY_CHANGES = IN_MOVED_FROM | IN_MOVED_TO | IN_CREATE | IN_DELETE
WATCH_MASK = DIRECTORY_CHANGES | IN_CLOSE_WRITE | IN_DELETE_SELF | IN_MOVE_SELF
INOTIFY_EVENT = struct.Struct("iIII")


class NativePerformanceEvents:
    def __init__(self, homebrew, emit, logger):
        self.homebrew = Path(homebrew)
        self.emit = emit
        self.logger = logger
        self.loop = None
        self.fd = None
        self.watches = {}
        self.bus = None
        self.process = None
        self.tasks = set()
        self.bus_task = None
        self.file_timer = None
        self.event_timer = None
        self.file_revision = 0
        self.signature = None
        self.closing = False
        self.libc = None

    def _task(self, coroutine):
        task = self.loop.create_task(coroutine)
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)
        return task

    async def start(self):
        if self.closing:
            return
        self.loop = asyncio.get_running_loop()
        try:
            self._start_inotify()
            self.signature = self._conflict_signature()
        except (AttributeError, OSError, ValueError) as error:
            self._close_inotify()
            self.logger.warning(f"Native performance file notifications unavailable: {error}")
        # Connecting to systemd must not delay or prevent controller startup.
        self.bus_task = self._task(self._watch_systemd_process())

    def changed(self):
        if self.closing:
            return
        if self.loop is None:
            self.loop = asyncio.get_running_loop()
        if self.event_timer is not None:
            self.event_timer.cancel()
        self.event_timer = self.loop.call_later(0.25, self._emit_changed)

    def _emit_changed(self):
        self.event_timer = None
        self._task(self._emit())

    async def _emit(self):
        try:
            await self.emit()
        except Exception as error:
            self.logger.warning(f"Could not notify native performance status change: {error}")

    def _start_inotify(self):
        self.libc = ctypes.CDLL(None, use_errno=True)
        self.libc.inotify_init1.argtypes = [ctypes.c_int]
        self.libc.inotify_init1.restype = ctypes.c_int
        self.libc.inotify_add_watch.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_uint32]
        self.libc.inotify_add_watch.restype = ctypes.c_int
        self.libc.inotify_rm_watch.argtypes = [ctypes.c_int, ctypes.c_int]
        self.libc.inotify_rm_watch.restype = ctypes.c_int
        self.fd = self.libc.inotify_init1(os.O_NONBLOCK | os.O_CLOEXEC)
        if self.fd < 0:
            self.fd = None
            raise OSError(ctypes.get_errno(), "inotify_init1 failed")
        self._refresh_watches()
        self.loop.add_reader(self.fd, self._read_inotify)

    def _refresh_watches(self):
        for name, path in (("homebrew", self.homebrew),
                           ("settings", self.homebrew / "settings"),
                           ("plugins", self.homebrew / "plugins")):
            if name in self.watches.values() or not path.is_dir():
                continue
            descriptor = self.libc.inotify_add_watch(self.fd, os.fsencode(path), WATCH_MASK)
            if descriptor < 0:
                raise OSError(ctypes.get_errno(), f"Cannot watch {path}")
            self.watches[descriptor] = name
        if not self.watches:
            raise OSError("Decky homebrew directory is unavailable")

    def _read_inotify(self):
        relevant = False
        try:
            while True:
                try:
                    data = os.read(self.fd, 65536)
                except BlockingIOError:
                    break
                if not data:
                    break
                offset = 0
                while offset + INOTIFY_EVENT.size <= len(data):
                    descriptor, mask, _, length = INOTIFY_EVENT.unpack_from(data, offset)
                    offset += INOTIFY_EVENT.size
                    name = os.fsdecode(data[offset:offset + length].split(b"\0", 1)[0])
                    offset += length
                    directory = self.watches.get(descriptor)
                    if mask & (IN_DELETE_SELF | IN_MOVE_SELF | IN_IGNORED):
                        self.watches.pop(descriptor, None)
                        if not mask & IN_IGNORED:
                            self.libc.inotify_rm_watch(self.fd, descriptor)
                    if (mask & IN_Q_OVERFLOW
                            or (directory == "settings" and name == "loader.json"
                                and mask & (IN_CLOSE_WRITE | IN_MOVED_TO | IN_MOVED_FROM | IN_DELETE))
                            or (directory == "plugins" and name in POWER_PLUGINS)
                            or (directory == "homebrew" and name in ("settings", "plugins"))
                            or (directory in ("settings", "plugins")
                                and mask & (IN_DELETE_SELF | IN_MOVE_SELF | IN_IGNORED))):
                        relevant = True
            if relevant:
                self._refresh_watches()
                self.file_revision += 1
                if self.file_timer is not None:
                    self.file_timer.cancel()
                self.file_timer = self.loop.call_later(0.25, self._check_files_later)
        except (OSError, ValueError) as error:
            self._close_inotify()
            self.logger.warning(f"Native performance file notifications stopped: {error}")

    def _conflict_signature(self):
        installed = None
        try:
            installed = tuple((self.homebrew / "plugins" / name).exists() for name in POWER_PLUGINS)
            loader = json.loads((self.homebrew / "settings/loader.json").read_text())
            disabled = loader.get("disabled_plugins", [])
            if (not isinstance(disabled, list)
                    or any(not isinstance(name, str) for name in disabled)):
                raise ValueError("Invalid disabled plugins")
            return installed, tuple(name in disabled for name in POWER_PLUGINS)
        except (OSError, ValueError, AttributeError):
            return installed, None

    def _check_files_later(self):
        self.file_timer = None
        self._task(self._check_files(self.file_revision))

    async def _check_files(self, revision):
        # Loader writes can briefly be incomplete. Wait for the completed write,
        # then retry a bounded number of times before exposing a persistent error.
        for delay in (0, 0.1, 0.25, 0.5):
            if delay:
                await asyncio.sleep(delay)
            signature = await asyncio.to_thread(self._conflict_signature)
            if self.closing or revision != self.file_revision:
                return
            if signature[1] is not None:
                break
        if signature != self.signature:
            self.signature = signature
            self.changed()

    async def _call(self, bus, **kwargs):
        from dbus_next import Message, MessageType
        reply = await asyncio.wait_for(bus.call(Message(**kwargs)), timeout=2)
        if reply.message_type == MessageType.ERROR:
            raise RuntimeError(reply.error_name)
        return reply

    async def _watch_systemd_process(self):
        # Decky's frozen Python omits stdlib modules needed by dbus-next.
        # Use the system interpreter, as the controller and fan workers do.
        retry = 1
        worker = Path(__file__).resolve()
        while not self.closing:
            process = None
            try:
                process = await asyncio.create_subprocess_exec(
                    "/usr/bin/python3", "-B", str(worker), "--systemd-events",
                    stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.STDOUT,
                    env={**os.environ, "LD_LIBRARY_PATH": "", "PYTHONPATH": str(worker.parent)},
                )
                self.process = process
                while line := await process.stdout.readline():
                    message = line.decode(errors="replace").strip()
                    if message == EVENT:
                        retry = 1
                        self.changed()
                    elif message:
                        self.logger.warning(f"Native performance event worker: {message[:600]}")
                result = await process.wait()
                if not self.closing:
                    self.logger.warning(f"Native performance event worker exited: {result}")
            except asyncio.CancelledError:
                raise
            except Exception as error:
                self.logger.warning(f"Native performance event worker unavailable: {error}")
            finally:
                if process is not None:
                    if process.stdin is not None:
                        process.stdin.close()
                    if process.returncode is None:
                        try:
                            process.terminate()
                        except ProcessLookupError:
                            pass
                    try:
                        await asyncio.wait_for(process.wait(), timeout=3)
                    except asyncio.TimeoutError:
                        process.kill()
                        await process.wait()
                self.process = None
            if not self.closing:
                await asyncio.sleep(retry)
                retry = min(retry * 2, 60)

    async def _watch_systemd(self):
        try:
            from dbus_next import BusType, MessageType
            from dbus_next.aio import MessageBus
        except ImportError as error:
            self.logger.warning(f"Native performance service notifications unavailable: {error}")
            return

        retry = 1
        while not self.closing:
            bus = None
            subscribed = False
            signal_handler = None
            try:
                bus = MessageBus(bus_type=BusType.SYSTEM)
                await asyncio.wait_for(bus.connect(), timeout=3)
                self.bus = bus
                owner = await self._call(bus, destination=DBUS, path=DBUS_PATH,
                                         interface=DBUS, member="GetNameOwner",
                                         signature="s", body=[SYSTEMD])

                def signal_handler(message):
                    if message.message_type != MessageType.SIGNAL or message.sender != owner.body[0]:
                        return
                    if (message.interface == PROPERTIES and message.path == UNIT_PATH
                            and message.member == "PropertiesChanged" and len(message.body) == 3
                            and message.body[0] == SYSTEMD + ".Unit"
                            and {"ActiveState", "SubState", "LoadState", "UnitFileState"}.intersection(
                                set(message.body[1]) | set(message.body[2]))):
                        self.changed()
                    elif (message.interface == MANAGER and message.path == SYSTEMD_PATH
                          and message.member == "UnitFilesChanged"):
                        # This signal has no unit argument. It is rare and a full
                        # status read remains event-driven, including uninstallation.
                        self.changed()

                bus.add_message_handler(signal_handler)
                for rule in (
                    f"type='signal',sender='{SYSTEMD}',interface='{PROPERTIES}',path='{UNIT_PATH}',member='PropertiesChanged'",
                    f"type='signal',sender='{SYSTEMD}',interface='{MANAGER}',path='{SYSTEMD_PATH}',member='UnitFilesChanged'",
                ):
                    await self._call(bus, destination=DBUS, path=DBUS_PATH,
                                     interface=DBUS, member="AddMatch", signature="s", body=[rule])
                await self._call(bus, destination=SYSTEMD, path=SYSTEMD_PATH,
                                 interface=MANAGER, member="Subscribe")
                subscribed = True
                retry = 1
                self.changed()
                await bus.wait_for_disconnect()
                if not self.closing:
                    raise RuntimeError("System bus disconnected")
            except asyncio.CancelledError:
                raise
            except Exception as error:
                self.logger.warning(f"Native performance service notifications unavailable: {error}")
            finally:
                if bus is not None:
                    if signal_handler is not None:
                        bus.remove_message_handler(signal_handler)
                    if subscribed and bus.connected:
                        try:
                            await self._call(bus, destination=SYSTEMD, path=SYSTEMD_PATH,
                                             interface=MANAGER, member="Unsubscribe")
                        except Exception:
                            pass
                    bus.disconnect()
                self.bus = None
            # Only reconnect a failed event transport; never poll bridge status.
            if not self.closing:
                await asyncio.sleep(retry)
                retry = min(retry * 2, 60)

    def _close_inotify(self):
        if self.fd is not None:
            self.loop.remove_reader(self.fd)
            os.close(self.fd)
            self.fd = None
        self.watches.clear()

    async def close(self):
        self.closing = True
        for timer in (self.file_timer, self.event_timer):
            if timer is not None:
                timer.cancel()
        self.file_timer = self.event_timer = None
        self._close_inotify()
        tasks = list(self.tasks)
        for task in tasks:
            task.cancel()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)


async def _systemd_worker():
    import logging
    import signal
    import sys

    async def emit():
        print(EVENT, flush=True)

    logging.basicConfig(level=logging.WARNING, format="%(message)s")
    monitor = NativePerformanceEvents(".", emit, logging.getLogger(__name__))
    monitor.loop = asyncio.get_running_loop()
    stopped = asyncio.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        monitor.loop.add_signal_handler(sig, stopped.set)
    # EOF also stops the worker if the Decky backend exits without unloading.
    monitor.loop.add_reader(sys.stdin.fileno(), stopped.set)
    monitor._task(monitor._watch_systemd())
    try:
        await stopped.wait()
    finally:
        monitor.loop.remove_reader(sys.stdin.fileno())
        await monitor.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--systemd-events", action="store_true", required=True)
    parser.parse_args()
    asyncio.run(_systemd_worker())
