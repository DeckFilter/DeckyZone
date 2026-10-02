"""Exercise acknowledgements and partial failures without touching hardware."""

from pathlib import Path
from types import SimpleNamespace

import pytest

from services.performance_bridge.controller import Controller
from services.performance_bridge.compatibility import (
    DEVICE_CONFIG, MANAGER_SCHEMA, adapted_device_config, check_environment,
)
from services.performance_bridge.probe import check_runtime, inspect
from services.performance_bridge.ryzenadj import RyzenAdjBackend, check_ownership
from services.performance_bridge.sysfs import Unavailable


@pytest.mark.parametrize("state", ("stopping", "offline", "unknown", ""))
def test_shutdown_never_restarts_manager(monkeypatch, state):
    from services.performance_bridge import lifecycle

    calls = []

    def run(command, **kwargs):
        calls.append(command)
        return SimpleNamespace(stdout=state + "\n", returncode=1)

    monkeypatch.setattr(lifecycle.subprocess, "run", run)
    lifecycle.reconnect_manager()
    assert calls == [["/usr/bin/systemctl", "is-system-running"]]


@pytest.mark.parametrize("state", ("running", "degraded", "starting"))
def test_live_manager_can_reconnect(monkeypatch, state):
    from services.performance_bridge import lifecycle

    calls = []

    def run(command, **kwargs):
        calls.append(command)
        return SimpleNamespace(stdout=state + "\n", returncode=0 if state == "running" else 1)

    monkeypatch.setattr(lifecycle.subprocess, "run", run)
    monkeypatch.setattr(lifecycle.pwd, "getpwnam", lambda name: SimpleNamespace(pw_uid=1000, pw_gid=1000))
    monkeypatch.setattr(lifecycle.Path, "exists", lambda path: True)
    lifecycle.reconnect_manager()
    assert calls[-1] == ["/usr/bin/systemctl", "--user", "try-restart", "steamos-manager.service"]


def test_user_shutdown_does_not_restart_manager(monkeypatch):
    from services.performance_bridge import lifecycle

    states = iter(("running", "stopping"))
    calls = []

    def run(command, **kwargs):
        calls.append(command)
        return SimpleNamespace(stdout=next(states) + "\n", returncode=1)

    monkeypatch.setattr(lifecycle.subprocess, "run", run)
    monkeypatch.setattr(lifecycle.pwd, "getpwnam", lambda name: SimpleNamespace(pw_uid=1000, pw_gid=1000))
    monkeypatch.setattr(lifecycle.Path, "exists", lambda path: True)
    lifecycle.reconnect_manager()
    assert all("try-restart" not in command for command in calls)


@pytest.fixture
def backend(tmp_path, monkeypatch):
    monkeypatch.setattr(RyzenAdjBackend, "validate_binary", lambda self: None)
    monkeypatch.setattr(RyzenAdjBackend, "_power_source", staticmethod(lambda: ("ac",)))
    monkeypatch.setattr(RyzenAdjBackend, "_sleep_elapsed", staticmethod(lambda: 0))
    result = RyzenAdjBackend(Path("/fixture/ryzenadj"), tmp_path / "state.json")
    result.calls = []
    result.fail_at = None

    def run(args, **kwargs):
        result.calls.append(args[-1])
        name, value = args[-1][2:].split("=")
        stdout = f"Sucessfully set {name.replace('-', '_')} to {value}\n"
        if len(result.calls) == result.fail_at:
            stdout = "command rejected\n"
        return SimpleNamespace(returncode=0, stdout=stdout)

    monkeypatch.setattr("services.performance_bridge.ryzenadj.subprocess.run", run)
    result.initialize()
    result.calls.clear()
    return result


@pytest.mark.parametrize("failed_command", (1, 2, 3))
def test_no_partial_success_or_retry(backend, failed_command):
    controller = Controller(backend, lambda: None)
    before = controller.snapshot
    backend.fail_at = failed_command
    with pytest.raises(Unavailable, match="Application uncertain"):
        controller.change(watts=8)
    assert len(backend.calls) == failed_command
    assert controller.snapshot == before
    with pytest.raises(Unavailable):
        controller.change(watts=15)
    assert len(backend.calls) == failed_command


def test_presets_and_custom_survive_restart(backend):
    controller = Controller(backend, lambda: None)
    controller.change(watts=12)
    controller.change(profile="performance")
    assert controller.snapshot.limits == (28, 28, 28)
    backend.initialize()
    restarted = Controller(backend, lambda: None)
    restarted.change(profile="custom")
    assert restarted.snapshot.limits == (12, 12, 12)


def test_power_event_reapplies_only_once(backend, monkeypatch):
    controller = Controller(backend, lambda: None)
    monkeypatch.setattr(backend, "_power_source", lambda: ("battery",))
    controller.read()
    controller.read()
    assert backend.calls == [
        "--slow-limit=15000",
        "--stapm-limit=15000",
        "--fast-limit=15000",
    ]


@pytest.mark.parametrize("watts", (0, 7, 29, True, 8.5))
def test_rejects_unsafe_values_before_commands(backend, watts):
    with pytest.raises(ValueError):
        backend.set_tdp(watts)
    assert not backend.calls


@pytest.fixture
def environment(tmp_path):
    release = tmp_path / "etc/os-release"
    release.parent.mkdir()
    release.write_text('ID=steamos\nVERSION_ID="3.9.1"\n')
    package = tmp_path / "usr/lib/holo/pacmandb/local/steamos-manager-26.4.1-2/desc"
    package.parent.mkdir(parents=True)
    package.write_text("%NAME%\nsteamos-manager\n\n%VERSION%\n26.4.1-2\n")
    schema = tmp_path / MANAGER_SCHEMA
    schema.parent.mkdir(parents=True)
    schema.write_text('''<node>
      <interface name="com.steampowered.SteamOSManager1.PerformanceProfile1">
        <property name="AvailablePerformanceProfiles" type="as" access="read"/>
        <property name="SuggestedDefaultPerformanceProfile" type="s" access="read"/>
        <property name="PerformanceProfile" type="s" access="readwrite"/>
      </interface>
      <interface name="com.steampowered.SteamOSManager1.TdpLimit1">
        <property name="TdpLimitMin" type="u" access="read"/>
        <property name="TdpLimitMax" type="u" access="read"/>
        <property name="TdpLimit" type="u" access="readwrite"/>
      </interface>
      <interface name="com.steampowered.SteamOSManager1.RemoteInterface1">
        <property name="RemoteInterfaces" type="as" access="read"/>
      </interface>
    </node>''')
    config = tmp_path / DEVICE_CONFIG
    config.parent.mkdir(parents=True)
    config.write_text('''[[device]]
dmi.sys_vendor = "ZOTAC"
dmi.board_name = "G0A1W"
device = "zotac_gaming_zone"
variant = "G0A1W"
[performance_profile]
platform_profile_name = "zotac_zone_platform"
[tdp_limit]
method = "firmware_attribute"
[tdp_limit.firmware_attribute]
attribute = "zotac_zone_platform"
performance_profile = "custom"
[gpu_performance]
driver = "amdgpu"
''')
    loader = tmp_path / "home/deck/homebrew/settings/loader.json"
    loader.parent.mkdir(parents=True)
    loader.write_text('{"disabled_plugins": []}')
    return tmp_path


@pytest.mark.parametrize("os_id", ("bazzite", "cachyos", "arch", "steamdeck"))
def test_only_actual_steamos_identity_is_accepted(environment, os_id):
    (environment / "etc/os-release").write_text(
        f'ID={os_id}\nID_LIKE=steamos\nPRETTY_NAME="SteamOS"\n'
    )
    with pytest.raises(Unavailable, match="requires SteamOS"):
        check_environment(environment)


def test_compatible_environment_and_os_release_fallback(environment):
    assert check_environment(environment)["manager_version"] == "26.4.1-2"
    (environment / "etc/os-release").rename(environment / "usr/lib/os-release")
    assert check_environment(environment)["os_id"] == "steamos"


@pytest.mark.parametrize("version", (
    "26.4.0-1", "26.4.1-3", "26.5.0-1", "26.10.0-1", "27.0.0-1", "1:26.4.1-1",
))
def test_compatible_manager_releases_ignore_package_revision(environment, version):
    package = next(environment.glob("usr/lib/holo/pacmandb/local/*/desc"))
    package.write_text(f"%NAME%\nsteamos-manager\n\n%VERSION%\n{version}\n")
    assert check_environment(environment)["manager_version"] == version


@pytest.mark.parametrize("version", (
    "25.3.0-1", "26.3.0-1", "1:26.3.0-1", "26.4.0rc1-1", "27.0.0beta1-1", "unknown",
))
def test_old_or_unrecognized_manager_is_rejected(environment, version):
    package = next(environment.glob("usr/lib/holo/pacmandb/local/*/desc"))
    package.write_text(f"%NAME%\nsteamos-manager\n\n%VERSION%\n{version}\n")
    with pytest.raises(Unavailable, match="Requires SteamOS Manager 26.4.0 or newer"):
        check_environment(environment)


@pytest.mark.parametrize("before,after", (
    ('name="TdpLimit" type="u"', 'name="TdpLimit" type="d"'),
    ('name="PerformanceProfile" type="s" access="readwrite"',
     'name="PerformanceProfile" type="s" access="read"'),
    ('name="RemoteInterfaces"', 'name="ChangedRemoteInterfaces"'),
))
def test_changed_interface_stops_controller_before_power_write(environment, backend, before, after):
    controller = Controller(backend, lambda: check_runtime(environment))
    schema = environment / MANAGER_SCHEMA
    schema.write_text(schema.read_text().replace(before, after))
    with pytest.raises(Unavailable, match="missing a compatible"):
        controller.change(watts=12)
    assert not backend.calls
    assert controller.fault


def test_missing_interface_schema_blocks_even_current_manager(environment):
    (environment / MANAGER_SCHEMA).unlink()
    with pytest.raises(Unavailable, match="Cannot verify SteamOS Manager"):
        check_environment(environment)


def test_adapting_commented_headers_preserves_unrelated_device_settings(environment):
    import tomllib

    original = (environment / DEVICE_CONFIG).read_text().replace(
        '[performance_profile]', '  [performance_profile] # local driver'
    ).replace('[tdp_limit.firmware_attribute]', ' [tdp_limit.firmware_attribute] # firmware')
    adapted = tomllib.loads(adapted_device_config(original))
    assert "performance_profile" not in adapted
    assert adapted["tdp_limit"] == {"method": "remote_interface"}
    assert adapted["device"] == tomllib.loads(original)["device"]
    assert adapted["gpu_performance"] == {"driver": "amdgpu"}


def test_new_stock_power_backend_requires_revalidation(environment):
    config = environment / DEVICE_CONFIG
    config.write_text(config.read_text().replace('method = "firmware_attribute"', 'method = "amdgpu_hwmon"'))
    with pytest.raises(Unavailable, match="power configuration changed"):
        check_environment(environment)


def test_manager_removal_stops_running_controller_before_power_write(
    environment, backend
):
    controller = Controller(backend, lambda: check_runtime(environment))
    next(environment.glob("usr/lib/holo/pacmandb/local/*/desc")).unlink()
    with pytest.raises(Unavailable, match="Cannot verify installed"):
        controller.change(watts=12)
    assert not backend.calls
    assert controller.fault


@pytest.mark.parametrize("plugin", ("PowerControl", "SimpleDeckyTDP"))
def test_enabling_either_power_plugin_stops_before_power_write(
    environment, backend, plugin
):
    directory = environment / "home/deck/homebrew/plugins" / plugin
    directory.mkdir(parents=True)
    loader = environment / "home/deck/homebrew/settings/loader.json"
    loader.write_text('{"disabled_plugins": ["' + plugin + '"]}')
    controller = Controller(backend, lambda: check_runtime(environment))
    assert inspect(environment)["decky_power_plugins"][plugin] == {
        "installed": True,
        "disabled_in_decky": True,
    }
    loader.write_text('{"disabled_plugins": []}')
    with pytest.raises(Unavailable, match=f"Disable {plugin}"):
        controller.change(watts=12)
    assert not backend.calls


@pytest.mark.parametrize(
    "contents",
    ('[]', '{"disabled_plugins": null}', '{"disabled_plugins": [null]}'),
)
def test_unverifiable_plugin_state_blocks_ownership(environment, contents):
    (environment / "home/deck/homebrew/settings/loader.json").write_text(contents)
    with pytest.raises(Unavailable, match="Cannot verify disabled"):
        check_ownership(environment)


@pytest.mark.parametrize("plugin", ("PowerControl", "SimpleDeckyTDP"))
def test_old_coexistence_marker_cannot_bypass_conflicts(environment, plugin):
    (environment / "home/deck/homebrew/plugins" / plugin).mkdir(parents=True)
    marker = environment / "run/deckyzone-powercontrol-coexistence-test"
    marker.parent.mkdir()
    marker.write_text("allow-powercontrol-for-testing\n")
    with pytest.raises(Unavailable, match=f"Disable {plugin}"):
        check_ownership(environment)


@pytest.mark.parametrize("plugin", ("PowerControl", "SimpleDeckyTDP"))
def test_stop_hook_disables_boot_without_waiting_for_own_stop(monkeypatch, plugin):
    from services.performance_bridge import lifecycle

    monkeypatch.setattr(lifecycle, "power_plugin_status", lambda: {
        plugin: {"installed": True, "disabled_in_decky": False},
    })
    calls = []
    monkeypatch.setattr(lifecycle.subprocess, "run", lambda args, **kw: calls.append(args))
    lifecycle.disable_after_conflict()
    assert calls == [["/usr/bin/systemctl", "disable", "deckyzone-performance.service"]]


@pytest.mark.parametrize("installed,disabled", ((False, False), (True, True)))
def test_stop_hook_preserves_boot_without_active_plugin(monkeypatch, installed, disabled):
    from services.performance_bridge import lifecycle

    monkeypatch.setattr(lifecycle, "power_plugin_status", lambda: {
        "PowerControl": {"installed": installed, "disabled_in_decky": disabled},
    })
    calls = []
    monkeypatch.setattr(lifecycle.subprocess, "run", lambda args, **kw: calls.append(args))
    lifecycle.disable_after_conflict()
    assert not calls


@pytest.mark.parametrize("enabled", (True, False))
def test_bridge_toggle_reconciles_systemd_state(tmp_path, monkeypatch, enabled):
    from services.performance_bridge import control

    monkeypatch.setattr(control, "INSTALL", tmp_path)
    monkeypatch.setattr(control.os, "geteuid", lambda: 0)
    monkeypatch.setattr(control, "install", lambda payload: None)
    monkeypatch.setattr(control, "verify_manager_relay", lambda: None)
    states = iter([
        {"installed": True, "enabled": not enabled, "active": not enabled,
         "available": True, "needsSetup": False, "blockedReason": None},
        {"installed": True, "enabled": enabled, "active": enabled,
         "available": True, "needsSetup": False, "blockedReason": None},
    ])
    monkeypatch.setattr(control, "status", lambda: next(states))
    calls = []
    monkeypatch.setattr(control, "systemctl", lambda *args: calls.append(args))
    assert control.set_enabled(enabled)["enabled"] is enabled
    assert calls == [("enable" if enabled else "disable", "--now", control.UNIT)]


def test_bridge_stops_when_manager_cannot_relay_controls(tmp_path, monkeypatch):
    from services.performance_bridge import control

    monkeypatch.setattr(control, "INSTALL", tmp_path)
    monkeypatch.setattr(control.os, "geteuid", lambda: 0)
    monkeypatch.setattr(control, "install", lambda payload: None)
    states = iter([
        {"installed": True, "enabled": False, "active": False, "available": True},
        {"installed": True, "enabled": True, "active": True, "needsSetup": False},
    ])
    monkeypatch.setattr(control, "status", lambda: next(states))
    calls = []
    monkeypatch.setattr(control, "systemctl", lambda *args: calls.append(args))

    def unavailable():
        raise Unavailable("Manager relay unavailable")

    monkeypatch.setattr(control, "verify_manager_relay", unavailable)
    with pytest.raises(Unavailable, match="Manager relay unavailable"):
        control.set_enabled(True)
    assert calls == [("enable", "--now", control.UNIT), ("disable", "--now", control.UNIT)]


def test_bridge_toggle_allows_stop_but_never_start_when_blocked(tmp_path, monkeypatch):
    from services.performance_bridge import control

    monkeypatch.setattr(control, "INSTALL", tmp_path)
    monkeypatch.setattr(control.os, "geteuid", lambda: 0)
    state = {"installed": True, "enabled": True, "active": False,
             "available": False, "blockedReason": "Disable PowerControl"}
    monkeypatch.setattr(control, "status", lambda: state.copy())
    calls = []

    def stop(*args):
        calls.append(args)
        state["enabled"] = False

    monkeypatch.setattr(control, "systemctl", stop)
    with pytest.raises(Unavailable, match="Disable PowerControl"):
        control.set_enabled(True)
    assert not calls
    assert control.set_enabled(False)["enabled"] is False
    assert calls == [("disable", "--now", control.UNIT)]


def test_bridge_toggle_reports_failed_transition(tmp_path, monkeypatch):
    from services.performance_bridge import control

    monkeypatch.setattr(control, "INSTALL", tmp_path)
    monkeypatch.setattr(control.os, "geteuid", lambda: 0)
    monkeypatch.setattr(control, "install", lambda payload: None)
    monkeypatch.setattr(control, "verify_manager_relay", lambda: None)
    monkeypatch.setattr(control, "status", lambda: {
        "installed": True, "enabled": False, "active": False,
        "available": True, "blockedReason": None,
    })
    monkeypatch.setattr(control, "systemctl", lambda *args: None)
    with pytest.raises(Unavailable, match="state did not change"):
        control.set_enabled(True)
