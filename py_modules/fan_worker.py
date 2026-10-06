"""Systemd-supervised fan loop; ExecStopPost restores Auto after a hard kill."""

import argparse
import asyncio
import os
from pathlib import Path
import signal
import socket
import time

from fan_curve import FanSettings, atomic_json, requested_speed, read_json
from fan_hardware import FanHardware, check_ownership

RUNTIME = Path('/run/deckyzone-fan')
OWNER = RUNTIME / 'owned.json'
STATUS = RUNTIME / 'status.json'
LOGIN = 'org.freedesktop.login1'
LOGIN_PATH = '/org/freedesktop/login1'
LOGIN_MANAGER = LOGIN + '.Manager'


def notify(value):
    address = os.environ.get('NOTIFY_SOCKET')
    if not address:
        raise RuntimeError('Fan worker must run under systemd supervision')
    if address.startswith('@'):
        address = '\0' + address[1:]
    with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as client:
        client.connect(address)
        client.sendall(value.encode())


def restore_owned():
    if not OWNER.exists():
        return
    hardware = FanHardware(require_sensors=False)
    if hardware.identity != read_json(OWNER).get('device'):
        raise RuntimeError('Owned fan device changed; refusing an unrelated write')
    hardware.auto()
    OWNER.unlink(missing_ok=True)
    print('Restored firmware Auto', flush=True)


def parent_identity(pid):
    # The start-time field prevents PID reuse from keeping an orphan alive.
    stat = Path(f'/proc/{pid}/stat').read_text().rsplit(')', 1)[1].split()
    return stat[19]


class FanWorker:
    def __init__(self, settings, homebrew, parent, parent_started):
        self.settings = FanSettings(settings)
        self.homebrew = homebrew
        self.parent = parent
        self.parent_started = parent_started
        self.hardware = FanHardware()
        self.stop = asyncio.Event()
        self.preparing = False
        self.inhibitor = None
        self.bus = None
        self.last_speed = None
        self.last_revision = None
        self.zero_rpm_samples = 0
        self.signal_error = None

    def release_inhibitor(self):
        if self.inhibitor is not None:
            os.close(self.inhibitor)
            self.inhibitor = None

    async def call(self, **kwargs):
        from dbus_next import Message, MessageType
        reply = await asyncio.wait_for(self.bus.call(Message(**kwargs)), timeout=2)
        if reply.message_type == MessageType.ERROR:
            raise RuntimeError(f'Cannot prepare fan sleep protection: {reply.error_name}')
        return reply

    async def inhibit(self):
        reply = await self.call(destination=LOGIN, path=LOGIN_PATH,
                                interface=LOGIN_MANAGER, member='Inhibit', signature='ssss',
                                body=['sleep:shutdown', 'DeckyZone fan control',
                                      'Restore automatic fan control', 'delay'])
        if not reply.unix_fds or len(reply.body) != 1:
            raise RuntimeError('Fan sleep inhibitor did not return a file descriptor')
        self.inhibitor = reply.unix_fds[reply.body[0]]

    async def setup_sleep(self):
        from dbus_next import BusType, MessageType
        from dbus_next.aio import MessageBus
        self.bus = await MessageBus(bus_type=BusType.SYSTEM, negotiate_unix_fd=True).connect()
        owner = await self.call(destination='org.freedesktop.DBus', path='/org/freedesktop/DBus',
                                interface='org.freedesktop.DBus', member='GetNameOwner',
                                signature='s', body=[LOGIN])

        def signal_handler(message):
            if (message.message_type != MessageType.SIGNAL or message.sender != owner.body[0]
                    or message.interface != LOGIN_MANAGER or message.path != LOGIN_PATH
                    or message.member not in ('PrepareForSleep', 'PrepareForShutdown')):
                return
            self.preparing = bool(message.body[0])
            if self.preparing:
                try:
                    restore_owned()
                    self.last_speed = None
                    atomic_json(STATUS, {"active": False, "suspended": True, "updated": time.monotonic()})
                except Exception as error:
                    self.signal_error = error
                    self.stop.set()
                finally:
                    self.release_inhibitor()
                print(f'{message.member}: firmware Auto', flush=True)

        self.bus.add_message_handler(signal_handler)
        await self.call(destination='org.freedesktop.DBus', path='/org/freedesktop/DBus',
                        interface='org.freedesktop.DBus', member='AddMatch', signature='s',
                        body=[f"type='signal',sender='{LOGIN}',interface='{LOGIN_MANAGER}',path='{LOGIN_PATH}'"])
        await self.inhibit()
        reply = await self.call(destination=LOGIN, path=LOGIN_PATH,
                                interface='org.freedesktop.DBus.Properties', member='GetAll',
                                signature='s', body=[LOGIN_MANAGER])
        props = reply.body[0]
        if props['PreparingForSleep'].value or props['PreparingForShutdown'].value:
            raise RuntimeError('The device is preparing to sleep or shut down')

    def apply(self, config):
        check_ownership(self.homebrew)
        sample = self.hardware.sample()
        speed = requested_speed(config, sample['temperature'])
        if not OWNER.exists():
            atomic_json(OWNER, {"device": self.hardware.identity})
            # Set a conservative duty before switching from the firmware policy.
            self.hardware.speed(100)
            self.hardware.manual()
            self.last_speed = None
        elif sample['hardwareMode'] != 1:
            raise RuntimeError('Another controller changed the fan mode')
        if (self.last_speed is None or config['revision'] != self.last_revision
                or abs(speed - self.last_speed) >= 3 or speed == 100):
            self.hardware.speed(speed)
            self.last_speed = speed
            self.last_revision = config['revision']
        self.zero_rpm_samples = self.zero_rpm_samples + 1 if sample['rpm'] == 0 else 0
        if self.zero_rpm_samples >= 3:
            raise RuntimeError('Fan stopped reporting rotation; restored automatic control')
        atomic_json(STATUS, {**sample, "active": True, "suspended": False,
                             "dutyPercent": self.last_speed, "updated": time.monotonic()})

    async def run(self):
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, self.stop.set)
        try:
            await self.setup_sleep()
            notify('READY=1')
            while not self.stop.is_set():
                if parent_identity(self.parent) != self.parent_started:
                    raise RuntimeError('DeckyZone backend exited')
                if not self.bus.connected:
                    raise RuntimeError('Lost the connection used for sleep protection')
                config = self.settings.read()
                if config['mode'] not in ('manual', 'custom'):
                    break
                check_ownership(self.homebrew)
                if not self.preparing:
                    if self.inhibitor is None:
                        await self.inhibit()
                    # Recheck: PrepareForSleep may have arrived during Inhibit.
                    if not self.preparing:
                        self.apply(config)
                notify('WATCHDOG=1')
                try:
                    await asyncio.wait_for(self.stop.wait(), timeout=1)
                except asyncio.TimeoutError:
                    pass
            if self.signal_error:
                raise self.signal_error
        finally:
            try:
                restore_owned()
            finally:
                self.release_inhibitor()
                if self.bus is not None:
                    self.bus.disconnect()
                STATUS.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--settings', required=True)
    parser.add_argument('--homebrew')
    parser.add_argument('--parent', type=int)
    parser.add_argument('--parent-started')
    parser.add_argument('--restore', action='store_true')
    args = parser.parse_args()
    settings = FanSettings(args.settings)
    if args.restore:
        restore_owned()
        STATUS.unlink(missing_ok=True)
        if os.environ.get('SERVICE_RESULT', 'success') != 'success':
            try:
                already_disabled = settings.read()['mode'] == 'auto'
            except (OSError, ValueError, TypeError, KeyError):
                already_disabled = False
            if not already_disabled:
                settings.fail('Fan worker stopped unexpectedly; select Manual or Custom to try again')
        return
    try:
        asyncio.run(FanWorker(args.settings, args.homebrew, args.parent, args.parent_started).run())
    except Exception as error:
        settings.fail(str(error))
        print(f'Fan control stopped: {error}', flush=True)
        raise SystemExit(1)


if __name__ == '__main__':
    main()
