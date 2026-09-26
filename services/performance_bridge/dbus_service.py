"""SteamOS Manager v26.4.1 remote-provider contract on the system bus."""

import asyncio
import logging

from dbus_next import DBusError
from dbus_next.aio import MessageBus
from dbus_next.constants import NameFlag, PropertyAccess, RequestNameReply
from dbus_next.service import ServiceInterface, dbus_property

from .controller import Controller
from .sysfs import PROFILES, Unavailable


PROFILE_INTERFACE = "com.steampowered.SteamOSManager1.PerformanceProfile1"
TDP_INTERFACE = "com.steampowered.SteamOSManager1.TdpLimit1"
PROFILE_BUS = "com.deckyzone.PerformanceProfile1"
TDP_BUS = "com.deckyzone.TdpLimit1"
OBJECT_PATH = "/com/deckyzone/Performance"
LOG = logging.getLogger(__name__)


class ProfileInterface(ServiceInterface):
    def __init__(self, bridge):
        super().__init__(PROFILE_INTERFACE)
        self.bridge = bridge

    @dbus_property(access=PropertyAccess.READ)
    def AvailablePerformanceProfiles(self) -> "as":
        return list(PROFILES)

    @dbus_property(access=PropertyAccess.READ)
    def SuggestedDefaultPerformanceProfile(self) -> "s":
        return "custom"

    @dbus_property()
    def PerformanceProfile(self) -> "s":
        return self.bridge.published_snapshot().profile

    @PerformanceProfile.setter
    async def PerformanceProfile(self, value: "s"):
        await self.bridge.change(profile=value)


class TdpInterface(ServiceInterface):
    def __init__(self, bridge):
        super().__init__(TDP_INTERFACE)
        self.bridge = bridge

    @dbus_property(access=PropertyAccess.READ)
    def TdpLimitMin(self) -> "u":
        return self.bridge.controller.backend.minimum

    @dbus_property(access=PropertyAccess.READ)
    def TdpLimitMax(self) -> "u":
        return self.bridge.controller.backend.maximum

    @dbus_property()
    def TdpLimit(self) -> "u":
        snapshot = self.bridge.published_snapshot()
        if snapshot.profile != "custom":
            raise DBusError(
                "org.freedesktop.DBus.Error.NotSupported", "Select Custom first"
            )
        return snapshot.limits[0]

    @TdpLimit.setter
    async def TdpLimit(self, value: "u"):
        await self.bridge.change(watts=value)


class Bridge:
    """Separate bus names let Manager discover TDP only while Custom is active.

    The caller supplies connected buses: production uses the system bus; tests
    use a private daemon. No test backend/address option exists in the CLI.
    """

    def __init__(
        self, controller: Controller, profile_bus: MessageBus, tdp_bus: MessageBus
    ):
        self.controller = controller
        self.profile_bus = profile_bus
        self.tdp_bus = tdp_bus
        self.profile = ProfileInterface(self)
        self.tdp = TdpInterface(self)
        self.operations = asyncio.Lock()
        self.profile_owned = False
        self.tdp_owned = False
        self.stopped = asyncio.Event()

    def published_snapshot(self):
        # Properties expose the last completed transaction. Polling and every
        # write check sysfs separately; cached state is never hardware telemetry.
        if self.stopped.is_set() or self.controller.fault:
            raise DBusError("org.freedesktop.DBus.Error.Failed", "Provider unavailable")
        return self.controller.snapshot

    async def _own(self, bus, name, interface):
        bus.export(OBJECT_PATH, interface)
        try:
            reply = await bus.request_name(name, NameFlag.DO_NOT_QUEUE)
            if reply != RequestNameReply.PRIMARY_OWNER:
                raise Unavailable(f"Provider name already owned: {name}")
        except Exception:
            bus.unexport(OBJECT_PATH, interface)
            raise

    async def _tdp_visibility(self, visible):
        if visible and not self.tdp_owned:
            await self._own(self.tdp_bus, TDP_BUS, self.tdp)
            self.tdp_owned = True
        elif not visible and self.tdp_owned:
            self.tdp_bus.unexport(OBJECT_PATH, self.tdp)
            await self.tdp_bus.release_name(TDP_BUS)
            self.tdp_owned = False

    async def _withdraw(self):
        self.stopped.set()
        # Unexport even if a broken bus prevents ReleaseName. No stale setters.
        self.profile_bus.unexport(OBJECT_PATH, self.profile)
        self.tdp_bus.unexport(OBJECT_PATH, self.tdp)
        for bus, name, owned in (
            (self.tdp_bus, TDP_BUS, self.tdp_owned),
            (self.profile_bus, PROFILE_BUS, self.profile_owned),
        ):
            if owned and bus.connected:
                try:
                    await bus.release_name(name)
                except (OSError, DBusError, EOFError):
                    LOG.warning("Bus unavailable while releasing %s", name)
        self.tdp_owned = False
        self.profile_owned = False

    async def start(self):
        async with self.operations:
            snapshot = await asyncio.to_thread(self.controller.read)
            try:
                await self._own(self.profile_bus, PROFILE_BUS, self.profile)
                self.profile_owned = True
                await self._tdp_visibility(snapshot.profile == "custom")
            except Exception:
                await self._withdraw()
                raise

    async def _execute(self, operation, **kwargs):
        async with self.operations:
            if self.stopped.is_set():
                raise DBusError("org.freedesktop.DBus.Error.Failed", "Provider stopped")
            try:
                if not self.profile_bus.connected or not self.tdp_bus.connected:
                    raise Unavailable("Provider bus disconnected")
                result = await asyncio.to_thread(operation, **kwargs)
            except ValueError as error:
                raise DBusError(
                    "org.freedesktop.DBus.Error.InvalidArgs", str(error)
                ) from error
            except (OSError, Unavailable) as error:
                LOG.error("Withdrawing performance provider: %s", error)
                await self._withdraw()
                raise DBusError(
                    "org.freedesktop.DBus.Error.Failed", str(error)
                ) from error
            return result

    async def read(self):
        return await self._execute(self.controller.read)

    async def change(self, **kwargs):
        # Keep publication inside the same lock as the write. A second request
        # must not publish an older profile or reacquire TDP after a later preset.
        async with self.operations:
            if self.stopped.is_set():
                raise DBusError("org.freedesktop.DBus.Error.Failed", "Provider stopped")
            try:
                if not self.profile_bus.connected or not self.tdp_bus.connected:
                    raise Unavailable("Provider bus disconnected")
                snapshot = await asyncio.to_thread(self.controller.change, **kwargs)
                await self._tdp_visibility(snapshot.profile == "custom")
            except ValueError as error:
                raise DBusError(
                    "org.freedesktop.DBus.Error.InvalidArgs", str(error)
                ) from error
            except Exception as error:
                LOG.error("Withdrawing performance provider: %s", error)
                await self._withdraw()
                raise DBusError(
                    "org.freedesktop.DBus.Error.Failed", str(error)
                ) from error
            self.profile.emit_properties_changed(
                {"PerformanceProfile": snapshot.profile}
            )
            if self.tdp_owned:
                self.tdp.emit_properties_changed({"TdpLimit": snapshot.limits[0]})

    async def monitor(self):
        while not self.stopped.is_set():
            try:
                await self.read()
            except DBusError:
                return
            try:
                await asyncio.wait_for(self.stopped.wait(), timeout=1)
            except TimeoutError:
                pass

    async def close(self):
        # Do not cancel an in-flight sysfs worker: cancellation cannot undo writes.
        async with self.operations:
            await self._withdraw()
