"""Shared ownership and D-Bus safety checks with an in-memory backend.

Run inside dbus-run-session; no system service or hardware is required.
"""

import asyncio

import pytest
from dbus_next import DBusError
from dbus_next.aio import MessageBus

from services.performance_bridge.controller import Controller
from services.performance_bridge.dbus_service import (
    Bridge,
    OBJECT_PATH,
    PROFILE_BUS,
    PROFILE_INTERFACE,
    TDP_BUS,
    TDP_INTERFACE,
)
from services.performance_bridge.probe import inspect, production_controller
from services.performance_bridge.sysfs import Snapshot, Unavailable


class FixtureBackend:
    minimum = 8
    maximum = 30

    def __init__(self):
        self.snapshot = Snapshot("custom", (15,) * 3)
        self.writes = []
        self.fail_at = None

    def read(self):
        return self.snapshot

    def _apply(self, profile, watts):
        for _ in range(3):
            self.writes.append(watts)
            if len(self.writes) == self.fail_at:
                raise OSError("injected power-write error")
        self.snapshot = Snapshot(profile, (watts,) * 3)

    def set_profile(self, profile):
        self._apply(profile, {"low-power": 8, "balanced": 15, "performance": 28}[profile])

    def set_tdp(self, watts):
        self._apply("custom", watts)


@pytest.fixture
def backend():
    return FixtureBackend()


def controller(backend):
    return Controller(backend, lambda: None)


def test_ownership_is_checked_before_each_operation(backend):
    control = controller(backend)

    def lost():
        raise Unavailable("another owner")

    control.check_ownership = lost
    with pytest.raises(Unavailable, match="another owner"):
        control.change(watts=20)
    assert not backend.writes


def test_probe_and_production_gate_are_read_only(tmp_path):
    report = inspect(tmp_path)
    assert report["available"] is False
    assert "sysfs_unavailable" in report["blockers"]
    assert not list(tmp_path.iterdir())
    with pytest.raises(Unavailable, match="Bridge unavailable"):
        production_controller()


@pytest.mark.asyncio
async def test_dbus_contract_lifecycle_and_faults(backend):
    # MessageBus() uses DBUS_SESSION_BUS_ADDRESS supplied by dbus-run-session.
    profile_bus = await MessageBus().connect()
    tdp_bus = await MessageBus().connect()
    client = await MessageBus().connect()
    bridge = Bridge(controller(backend), profile_bus, tdp_bus)
    try:
        await bridge.start()
        assert not backend.writes  # Discovery/startup never applies a setting.
        intro = await client.introspect(PROFILE_BUS, OBJECT_PATH)
        schema = next(i for i in intro.interfaces if i.name == PROFILE_INTERFACE)
        assert {p.name: p.signature for p in schema.properties} == {
            "AvailablePerformanceProfiles": "as",
            "PerformanceProfile": "s",
            "SuggestedDefaultPerformanceProfile": "s",
        }
        profile = client.get_proxy_object(
            PROFILE_BUS, OBJECT_PATH, intro
        ).get_interface(PROFILE_INTERFACE)
        changed = []
        properties = client.get_proxy_object(
            PROFILE_BUS, OBJECT_PATH, intro
        ).get_interface("org.freedesktop.DBus.Properties")
        properties.on_properties_changed(
            lambda name, values, invalidated: changed.append((name, values))
        )
        tdp_intro = await client.introspect(TDP_BUS, OBJECT_PATH)
        tdp_schema = next(i for i in tdp_intro.interfaces if i.name == TDP_INTERFACE)
        assert {p.name: p.signature for p in tdp_schema.properties} == {
            "TdpLimit": "u",
            "TdpLimitMin": "u",
            "TdpLimitMax": "u",
        }
        tdp = client.get_proxy_object(TDP_BUS, OBJECT_PATH, tdp_intro).get_interface(
            TDP_INTERFACE
        )
        assert await profile.get_available_performance_profiles() == [
            "low-power",
            "balanced",
            "performance",
            "custom",
        ]
        assert await tdp.get_tdp_limit_min() == 8
        assert await tdp.get_tdp_limit_max() == 30
        with pytest.raises(DBusError) as invalid:
            await tdp.set_tdp_limit(31)
        assert invalid.value.type == "org.freedesktop.DBus.Error.InvalidArgs"
        assert bridge.tdp_owned
        await tdp.set_tdp_limit(19)
        for preset in ("low-power", "balanced", "performance"):
            await profile.set_performance_profile(preset)
            assert await profile.get_performance_profile() == preset
            assert not bridge.tdp_owned
            with pytest.raises(DBusError):
                await client.introspect(TDP_BUS, OBJECT_PATH)
            with pytest.raises(DBusError) as preset_tdp:
                await bridge.change(watts=18)
            assert preset_tdp.value.type == "org.freedesktop.DBus.Error.InvalidArgs"
        await profile.set_performance_profile("custom")
        assert await tdp.get_tdp_limit() == 19
        assert any(
            name == PROFILE_INTERFACE
            and values.get("PerformanceProfile").value == "custom"
            for name, values in changed
        )
        # Concurrent slider calls must complete whole three-write transactions.
        backend.writes.clear()
        await asyncio.gather(tdp.set_tdp_limit(18), tdp.set_tdp_limit(20))
        assert backend.writes in (
            [18] * 3 + [20] * 3,
            [20] * 3 + [18] * 3,
        )
        backend.writes.clear()
        backend.fail_at = 2
        with pytest.raises(DBusError) as failure:
            await tdp.set_tdp_limit(21)
        assert failure.value.type == "org.freedesktop.DBus.Error.Failed"
        assert bridge.stopped.is_set()
        for name in (PROFILE_BUS, TDP_BUS):
            with pytest.raises(DBusError):
                await client.introspect(name, OBJECT_PATH)
        assert len(backend.writes) == 2
    finally:
        await bridge.close()
        for bus in (profile_bus, tdp_bus, client):
            bus.disconnect()
        await asyncio.gather(
            *(bus.wait_for_disconnect() for bus in (profile_bus, tdp_bus, client))
        )


@pytest.mark.asyncio
async def test_second_provider_cannot_replace_first(backend):
    buses = [await MessageBus().connect() for _ in range(4)]
    first = Bridge(controller(backend), *buses[:2])
    second = Bridge(controller(backend), *buses[2:])
    try:
        await first.start()
        with pytest.raises(Unavailable, match="already owned"):
            await second.start()
        assert first.profile_owned and first.tdp_owned
        assert not backend.writes
        await first.change(watts=20)
        assert first.controller.read().limits == (20, 20, 20)
    finally:
        await second.close()
        await first.close()
        for bus in buses:
            bus.disconnect()
        await asyncio.gather(*(bus.wait_for_disconnect() for bus in buses))


@pytest.mark.asyncio
async def test_bus_loss_prevents_further_writes(backend):
    buses = [await MessageBus().connect() for _ in range(2)]
    bridge = Bridge(controller(backend), *buses)
    try:
        await bridge.start()
        buses[0].disconnect()
        await buses[0].wait_for_disconnect()
        with pytest.raises(DBusError):
            await bridge.change(watts=20)
        assert bridge.stopped.is_set()
        assert not backend.writes
    finally:
        await bridge.close()
        for bus in buses:
            bus.disconnect()
        await asyncio.gather(*(bus.wait_for_disconnect() for bus in buses))
