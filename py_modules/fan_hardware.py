"""Existing ZONE hwmon API only; no direct EC access or kernel changes."""

from pathlib import Path
from fan_curve import read_json

POWER_PLUGINS = ("PowerControl", "SimpleDeckyTDP")


def conflicts(homebrew):
    root = Path(homebrew)
    data = read_json(root / "settings/loader.json")
    disabled = data.get("disabled_plugins", [])
    if not isinstance(disabled, list) or any(not isinstance(name, str) for name in disabled):
        raise ValueError("Cannot verify which Decky plugins are disabled")
    return [name for name in POWER_PLUGINS
            if (root / "plugins" / name).exists() and name not in disabled]


def check_ownership(homebrew):
    active = conflicts(homebrew)
    if active:
        raise ValueError(f"Disable {' and '.join(active)} in Decky settings")
    for path in Path('/proc').glob('[0-9]*/comm'):
        try:
            name = path.read_text().strip()
        except FileNotFoundError:
            continue
        if name in ("coolercontrold", "hhd", "fancontrol"):
            raise ValueError(f"Another fan controller is running: {name}")


class FanHardware:
    def __init__(self, root=Path('/'), require_sensors=True):
        root = Path(root)
        dmi = root / 'sys/class/dmi/id'
        if (dmi / 'sys_vendor').read_text().strip() != 'ZOTAC' or (dmi / 'board_name').read_text().strip() != 'G0A1W':
            raise ValueError('Fan control is currently supported on ZOTAC ZONE G0A1W')
        devices = {}
        for path in (root / 'sys/class/hwmon').glob('*'):
            try:
                name = (path / 'name').read_text().strip()
            except OSError:
                continue
            devices.setdefault(name, []).append(path)
        if len(devices.get('zotac_platform', [])) != 1:
            raise ValueError('ZONE fan interface is unavailable')
        self.path = devices['zotac_platform'][0]
        self.identity = str((self.path / 'device').resolve())
        self.temperature_path = None
        if require_sensors:
            if len(devices.get('k10temp', [])) != 1:
                raise ValueError('CPU temperature sensor is unavailable')
            self.temperature_path = devices['k10temp'][0] / 'temp1_input'
        for name in (('pwm1', 'pwm1_enable', 'fan1_input') if require_sensors else ('pwm1_enable',)):
            if not (self.path / name).is_file():
                raise ValueError(f'ZONE fan interface is missing {name}')

    def sample(self):
        if self.temperature_path is None:
            raise ValueError('CPU temperature sensor is unavailable')
        temperature = int(self.temperature_path.read_text()) / 1000
        rpm = int((self.path / 'fan1_input').read_text())
        pwm = int((self.path / 'pwm1').read_text())
        mode = int((self.path / 'pwm1_enable').read_text())
        if not 0 < temperature <= 115 or not 0 <= rpm <= 15000 or not 0 <= pwm <= 255:
            raise ValueError('Fan sensor returned an invalid reading')
        return {"temperature": temperature, "rpm": rpm, "pwm": pwm, "hardwareMode": mode}

    def auto(self):
        # This driver can report raw EC Auto=0 after accepting hwmon Auto=2.
        (self.path / 'pwm1_enable').write_text('2\n')

    def manual(self):
        (self.path / 'pwm1_enable').write_text('1\n')

    def speed(self, percent):
        if not 10 <= percent <= 100:
            raise ValueError('Fan duty must be between 10 and 100 percent')
        (self.path / 'pwm1').write_text(f'{round(percent * 255 / 100)}\n')
