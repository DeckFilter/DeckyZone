"""Fault and D-Bus contract tests. Fixtures never address the host's sysfs.

Run inside dbus-run-session; no system service or hardware is required.
"""

import asyncio
import os

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
from services.performance_bridge.sysfs import (
    ATTRIBUTES,
    DRIVER,
    SysfsBackend,
    Unavailable,
)


class FixtureBackend(SysfsBackend):
    """Model sysfs side effects and errors, including a cache-before-error driver.

    Test preset values are arbitrary, NOT the unvalidated ZOTAC presets.
    """

    def __init__(self, root):
        self.writes = []
        self.fail_at = None
        self.cache_before_error = False
        self.disappear_after_write = False
        super().__init__(root)

    def _write(self, path, value):
        self.writes.append((path, value))
        fail = len(self.writes) == self.fail_at
        if not fail or self.cache_before_error:
            path.write_text(value + "\n")
            if path == self.profile_dir / "profile":
                watts = {"low-power": 8, "balanced": 15, "performance": 28}[value]
                for name in ATTRIBUTES:
                    (self.attribute_dir / name / "current_value").write_text(str(watts))
            else:
                (self.profile_dir / "profile").write_text("custom")
        if fail:
            raise OSError("injected driver error")
        if self.disappear_after_write:
            path.unlink()


@pytest.fixture
def backend(tmp_path):
    profile = tmp_path / "class/platform-profile/platform-profile-0"
    profile.mkdir(parents=True)
    for key, value in {
        "name": DRIVER,
        "choices": "low-power balanced performance custom",
        "profile": "custom",
    }.items():
        (profile / key).write_text(value)
    for name in ATTRIBUTES:
        base = tmp_path / "class/firmware-attributes" / DRIVER / "attributes" / name
        base.mkdir(parents=True)
        for key, value in {
            "min_value": 8,
            "max_value": 28,
            "scalar_increment": 1,
            "current_value": 15,
        }.items():
            (base / key).write_text(str(value))
    return FixtureBackend(tmp_path)


def controller(backend):
    return Controller(backend, lambda: None)


def test_sysfs_write_never_creates_or_retries(tmp_path, monkeypatch):
    node = tmp_path / "current_value"
    with pytest.raises(FileNotFoundError):
        SysfsBackend._write(node, "20")
    assert not node.exists()
    node.write_text("15\n")
    calls = []

    def failed_write(fd, data):
        calls.append(data)
        raise OSError("firmware write failed")

    monkeypatch.setattr(os, "write", failed_write)
    with pytest.raises(OSError, match="firmware write failed"):
        SysfsBackend._write(node, "20")
    assert calls == [b"20\n"]
    assert node.read_text() == "15\n"


@pytest.mark.parametrize("invalid", [7, 29, 0, -1, 15.5, True])
def test_invalid_limit_never_writes(backend, invalid):
    control = controller(backend)
    with pytest.raises(ValueError):
        control.change(watts=invalid)
    assert backend.writes == []
    assert control.read().limits == (15, 15, 15)


@pytest.mark.parametrize("failure", [1, 2, 3])
@pytest.mark.parametrize("cache_before_error", [False, True])
def test_partial_writes_latch_fault_without_retry(backend, failure, cache_before_error):
    control = controller(backend)
    backend.fail_at = failure
    backend.cache_before_error = cache_before_error
    with pytest.raises(Unavailable, match="Application uncertain"):
        control.change(watts=20)
    assert len(backend.writes) == failure
    assert control.snapshot.limits == (15, 15, 15)
    assert control.custom_tdp == 15
    with pytest.raises(Unavailable):
        control.change(watts=15)
    assert len(backend.writes) == failure


def test_profile_failure_latches_fault(backend):
    control = controller(backend)
    backend.fail_at = 1
    backend.cache_before_error = True
    with pytest.raises(Unavailable):
        control.change(profile="performance")
    assert control.snapshot.profile == "custom"
    with pytest.raises(Unavailable):
        control.read()


def test_custom_restored_without_replaying_preset(backend):
    control = controller(backend)
    control.change(watts=19)
    control.change(profile="performance")
    with pytest.raises(ValueError):
        control.change(watts=18)
    backend.writes.clear()
    assert control.change(profile="custom").limits == (19, 19, 19)
    assert [path.parent.name for path, value in backend.writes] == list(ATTRIBUTES)


def test_external_change_or_device_loss_stops_writes(backend):
    control = controller(backend)
    (backend.profile_dir / "profile").write_text("balanced")
    with pytest.raises(Unavailable, match="outside the bridge"):
        control.change(watts=20)
    assert not backend.writes


def test_ownership_is_checked_before_each_operation(backend):
    control = controller(backend)

    def lost():
        raise Unavailable("another owner")

    control.check_ownership = lost
    with pytest.raises(Unavailable, match="another owner"):
        control.change(watts=20)
    assert not backend.writes


def test_range_intersection_and_unsupported_step(backend):
    (backend.attribute_dir / ATTRIBUTES[1] / "min_value").write_text("12")
    (backend.attribute_dir / ATTRIBUTES[2] / "max_value").write_text("22")
    narrowed = FixtureBackend(backend.root)
    assert (narrowed.minimum, narrowed.maximum) == (12, 22)
    with pytest.raises(ValueError):
        narrowed.set_tdp(23)
    assert not narrowed.writes
    (backend.attribute_dir / ATTRIBUTES[0] / "scalar_increment").write_text("2")
    with pytest.raises(Unavailable, match="1 W"):
        FixtureBackend(backend.root)


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
        assert await tdp.get_tdp_limit_max() == 28
        with pytest.raises(DBusError) as invalid:
            await tdp.set_tdp_limit(29)
        assert invalid.value.type == "org.freedesktop.DBus.Error.InvalidArgs"
        assert bridge.tdp_owned
        await tdp.set_tdp_limit(19)
        for preset in ("low-power", "balanced", "performance"):
            await profile.set_performance_profile(preset)
            assert await profile.get_performance_profile() == preset
            assert not bridge.tdp_owned
            with pytest.raises(DBusError):
                await client.introspect(TDP_BUS, OBJECT_PATH)
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
        assert [v for p, v in backend.writes] in (
            ["18"] * 3 + ["20"] * 3,
            ["20"] * 3 + ["18"] * 3,
        )
        backend.writes.clear()
        backend.fail_at = 2
        backend.cache_before_error = True
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
async def test_device_disappearance_withdraws_both_names(backend):
    buses = [await MessageBus().connect() for _ in range(2)]
    bridge = Bridge(controller(backend), *buses)
    try:
        await bridge.start()
        (backend.profile_dir / "profile").unlink()
        await asyncio.wait_for(bridge.monitor(), timeout=2)
        assert bridge.stopped.is_set()
        assert not bridge.profile_owned and not bridge.tdp_owned
        assert not backend.writes
    finally:
        await bridge.close()
        for bus in buses:
            bus.disconnect()
        await asyncio.gather(*(bus.wait_for_disconnect() for bus in buses))


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
