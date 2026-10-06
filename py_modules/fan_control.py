"""Decky RPC/lifecycle boundary for the global fan worker."""

import asyncio
from copy import deepcopy
import importlib.util
import os
from pathlib import Path
import shlex
import subprocess
import time

from fan_curve import DEFAULT_CURVE, FanSettings, powercontrol_curves, read_json, validate_manual_speed
from fan_hardware import FanHardware, check_ownership, conflicts
from fan_worker import STATUS, parent_identity

UNIT = 'deckyzone-fan.service'
WORKER = Path(__file__).with_name('fan_worker.py').resolve()


def run(*args, check=True, timeout=8):
    result = subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                            env={**os.environ, 'LD_LIBRARY_PATH': '', 'PYTHONPATH': str(WORKER.parent)})
    if check and result.returncode:
        raise RuntimeError(result.stderr.strip() or 'Could not change fan control service')
    return result


class FanControl:
    def __init__(self, settings_directory, homebrew):
        self.settings = FanSettings(settings_directory)
        self.homebrew = Path(homebrew)
        self.lock = asyncio.Lock()
        self.closing = False

    def status(self):
        config = self.settings.read()
        state = {"mode": config['mode'], "curve": config['curve'], "revision": config['revision'],
                 "manualSpeed": config['manualSpeed'],
                 "error": config.get('error', ''),
                 "available": False, "active": False, "suspended": False, "blockedReason": '',
                 "conflictingPlugins": [], "temperature": None, "rpm": None, "dutyPercent": None,
                 "defaultCurve": deepcopy(DEFAULT_CURVE)}
        try:
            hardware = FanHardware()
            state.update(hardware.sample())
            state['available'] = True
            state['conflictingPlugins'] = conflicts(self.homebrew)
            check_ownership(self.homebrew)
            if importlib.util.find_spec('dbus_next') is None:
                raise RuntimeError('Fan sleep protection requires the system dbus-next package')
            if STATUS.exists():
                sample = read_json(STATUS)
                if time.monotonic() - sample.get('updated', 0) < 4:
                    state.update({k: sample[k] for k in ('active', 'suspended', 'dutyPercent') if k in sample})
        except (OSError, ValueError, RuntimeError) as error:
            state['blockedReason'] = str(error)
        return state

    def start_worker(self):
        check_ownership(self.homebrew)
        FanHardware().sample()
        self.stop_worker()
        run('/usr/bin/systemctl', 'reset-failed', UNIT, check=False)
        # ExecStopPost runs in its own process even if the worker is SIGKILLed.
        restore = shlex.join(['/usr/bin/python3', str(WORKER), '--settings', str(self.settings.path.parent), '--restore'])
        run('/usr/bin/systemd-run', '--unit=' + UNIT, '--collect', '--service-type=notify',
            '--property=BindsTo=plugin_loader.service', '--property=After=plugin_loader.service',
            '--property=WatchdogSec=3s', '--property=WatchdogSignal=SIGKILL',
            '--property=TimeoutStartSec=10s', '--property=TimeoutStopSec=2s',
            '--property=RuntimeDirectory=deckyzone-fan', '--property=RuntimeDirectoryMode=0700',
            '--property=ExecStopPost=' + restore.replace('%', '%%'),
            '--setenv=PYTHONPATH=' + str(WORKER.parent), '--setenv=LD_LIBRARY_PATH=',
            '/usr/bin/python3', str(WORKER), '--settings', str(self.settings.path.parent),
            '--homebrew', str(self.homebrew), '--parent', str(os.getpid()),
            '--parent-started', parent_identity(os.getpid()), timeout=12)
        # READY only means sleep protection is ready. Confirm the first PWM write.
        deadline = time.monotonic() + 4
        while time.monotonic() < deadline:
            state = self.status()
            if state['active']:
                return
            if state['mode'] not in ('manual', 'custom'):
                raise RuntimeError(state['error'] or 'Fan control could not start')
            time.sleep(0.1)
        raise RuntimeError('Fan control did not report an applied speed')

    def stop_worker(self):
        result = run('/usr/bin/systemctl', 'stop', UNIT, check=False)
        if result.returncode and 'not loaded' not in result.stderr and 'not found' not in result.stderr:
            raise RuntimeError('Could not stop fan control: ' + result.stderr.strip())

    def select_auto(self):
        self.stop_worker()
        # An explicit Auto request may recover a manual duty left by a disabled
        # plugin. Automatic unload/cleanup still only touches our owned fan.
        check_ownership(self.homebrew)
        FanHardware(require_sensors=False).auto()

    async def startup(self):
        async with self.lock:
            try:
                await asyncio.to_thread(self.settings.migrate)
                config = await asyncio.to_thread(self.settings.read)
                if config['mode'] in ('manual', 'custom'):
                    await asyncio.to_thread(self.start_worker)
            except Exception as error:
                await asyncio.to_thread(self.settings.fail, str(error))
                await asyncio.to_thread(self.stop_worker)

    async def set_mode(self, mode, revision=None):
        # Accept the previous frontend's mode during a live plugin reload.
        if mode == 'curve':
            mode = 'custom'
        if mode not in ('auto', 'manual', 'custom'):
            raise ValueError('Select System Auto, Manual, or Custom')
        async with self.lock:
            if self.closing:
                raise RuntimeError('DeckyZone is stopping')
            if revision is None:
                config = await asyncio.to_thread(self.settings.read)
                revision = config['revision']
            if mode != 'auto':
                await asyncio.to_thread(check_ownership, self.homebrew)
            await asyncio.to_thread(self.settings.edit, revision, lambda data: data.update(mode=mode, error=''))
            try:
                await asyncio.to_thread(self.select_auto if mode == 'auto' else self.start_worker)
            except Exception as error:
                await asyncio.to_thread(self.settings.fail, str(error))
                await asyncio.to_thread(self.stop_worker)
                raise
            return await asyncio.to_thread(self.status)

    async def set_manual_speed(self, speed, revision):
        speed = validate_manual_speed(speed)
        async with self.lock:
            if self.closing:
                raise RuntimeError('DeckyZone is stopping')
            await asyncio.to_thread(check_ownership, self.homebrew)
            def update(config):
                if config['mode'] != 'manual':
                    raise ValueError('Select Manual before setting fan speed')
                config['manualSpeed'] = speed
            await asyncio.to_thread(self.settings.edit, revision, update)
            return await asyncio.to_thread(self.status)

    async def save_curve(self, curve, revision):
        async with self.lock:
            if self.closing:
                raise RuntimeError('DeckyZone is stopping')
            await asyncio.to_thread(self.settings.save_curve, curve, revision)
            return await asyncio.to_thread(self.status)

    async def imports(self):
        return await asyncio.to_thread(powercontrol_curves, self.homebrew)

    async def shutdown(self, reset=False):
        self.closing = True
        async with self.lock:
            try:
                await asyncio.to_thread(self.stop_worker)
                if reset:
                    self.settings.path.unlink(missing_ok=True)
            finally:
                if reset:
                    self.closing = False
        return {"name": "stopFanControl", "ok": True, "changed": True, "message": "Firmware fan control restored"}
