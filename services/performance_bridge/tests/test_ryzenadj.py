"""Exercise acknowledgements and partial failures without touching hardware."""

from pathlib import Path
from types import SimpleNamespace

import pytest

from services.performance_bridge.controller import Controller
from services.performance_bridge.compatibility import check_environment
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


@pytest.mark.parametrize("version", ("25.3.0-1", "26.3.0-1", "26.4.1-3", "27.0.0-1"))
def test_untested_manager_is_rejected(environment, version):
    package = next(environment.glob("usr/lib/holo/pacmandb/local/*/desc"))
    package.write_text(f"%NAME%\nsteamos-manager\n\n%VERSION%\n{version}\n")
    with pytest.raises(Unavailable, match="Requires tested SteamOS Manager"):
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
    states = iter([
        {"installed": True, "enabled": not enabled, "active": not enabled,
         "available": True, "blockedReason": None},
        {"installed": True, "enabled": enabled, "active": enabled,
         "available": True, "blockedReason": None},
    ])
    monkeypatch.setattr(control, "status", lambda: next(states))
    calls = []
    monkeypatch.setattr(control, "systemctl", lambda *args: calls.append(args))
    assert control.set_enabled(enabled)["enabled"] is enabled
    assert calls == [("enable" if enabled else "disable", "--now", control.UNIT)]


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
    monkeypatch.setattr(control, "status", lambda: {
        "installed": True, "enabled": False, "active": False,
        "available": True, "blockedReason": None,
    })
    monkeypatch.setattr(control, "systemctl", lambda *args: None)
    with pytest.raises(Unavailable, match="state did not change"):
        control.set_enabled(True)
