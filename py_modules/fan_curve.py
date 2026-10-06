"""Global fan settings and PowerControl's curve-only import boundary."""

from contextlib import contextmanager
import fcntl
import json
import math
import os
from pathlib import Path
import tempfile

# ONE Launcher 2.1.44: FanMode.GetDefault / Curve10 through Curve90.
DEFAULT_CURVE = [
    {"temperature": t, "fanRPMpercent": p}
    for t, p in ((10, 40), (20, 40), (30, 40), (40, 40), (50, 50),
                 (60, 60), (70, 80), (80, 90), (90, 100))
]
MAX_POINTS = 16
DEFAULT_MANUAL_SPEED = 50


def normalize_settings(data):
    if not isinstance(data, dict) or type(data.get('version')) is not int or data['version'] not in (1, 2, 3, 4):
        raise ValueError('Fan settings are invalid')
    version = data['version']
    modes = ('auto', 'custom') if version < 3 else ('auto', 'manual', 'curve' if version == 3 else 'custom')
    if data.get('mode') not in modes:
        raise ValueError('Fan mode is invalid')
    if type(data.get('revision')) is not int or data['revision'] < 0:
        raise ValueError('Fan settings revision is invalid')
    if not isinstance(data.get('error', ''), str):
        raise ValueError('Fan settings metadata is invalid')
    curve = data.get('curve')
    if version in (2, 3):
        profiles = data.get('profiles')
        if not isinstance(profiles, list) or any(not isinstance(p, dict) for p in profiles):
            raise ValueError('Saved fan curves are invalid')
        selected = data.get('selectedProfileId')
        current = next((p for p in profiles if p.get('id') == selected), None) if selected is not None else None
        if (selected is not None and current is None) or (data['mode'] in ('custom', 'curve') and current is None):
            raise ValueError('The selected fan curve does not exist')
        # Preserve the selection even in Auto/Manual. If none was selected,
        # keep the first saved curve, or ONE Launcher's default for an empty library.
        current = current or next(iter(profiles), None)
        curve = current.get('curve') if current is not None else DEFAULT_CURVE
    return {
        'version': 4,
        'mode': 'custom' if data['mode'] == 'curve' else data['mode'],
        'manualSpeed': validate_manual_speed(data.get('manualSpeed') if version >= 3 else DEFAULT_MANUAL_SPEED),
        'curve': validate_curve(curve),
        'revision': data['revision'],
        'error': data.get('error', ''),
    }


def default_settings():
    return normalize_settings({
        'version': 4, 'mode': 'auto', 'manualSpeed': DEFAULT_MANUAL_SPEED,
        'revision': 0, 'error': '', 'curve': DEFAULT_CURVE,
    })


def validate_manual_speed(value):
    if type(value) not in (int, float) or not math.isfinite(value) or not 10 <= value <= 100:
        raise ValueError('Fan speed must be between 10 and 100 percent')
    return value


def requested_speed(config, temperature):
    if config['mode'] == 'custom':
        return curve_speed(config['curve'], temperature)
    if config['mode'] != 'manual':
        raise ValueError('Select Manual or Custom before setting fan speed')
    speed = validate_manual_speed(config['manualSpeed'])
    if not math.isfinite(temperature) or not 0 < temperature <= 115:
        raise ValueError('Temperature is unavailable or invalid')
    return 100.0 if temperature >= 95 else speed


def validate_curve(points):
    if not isinstance(points, list) or not 2 <= len(points) <= MAX_POINTS:
        raise ValueError("Use 2–16 points for the fan curve")
    result = []
    for point in points:
        if not isinstance(point, dict):
            raise ValueError("Invalid fan curve point")
        values = [point.get("temperature"), point.get("fanRPMpercent")]
        if any(type(v) not in (int, float) or not math.isfinite(v) or not 0 <= v <= 100 for v in values):
            raise ValueError("Temperatures and fan speeds must be between 0 and 100")
        result.append(dict(zip(("temperature", "fanRPMpercent"), values)))
    result.sort(key=lambda point: point["temperature"])
    for before, after in zip(result, result[1:]):
        if before["temperature"] == after["temperature"]:
            raise ValueError("Each point needs a different temperature")
        if before["fanRPMpercent"] > after["fanRPMpercent"]:
            raise ValueError("Fan speed must not decrease as temperature rises")
    return result


def curve_speed(points, temperature):
    """PowerControl's linear segments, including implicit (0,0)/(100,100)."""
    if not math.isfinite(temperature) or not 0 < temperature <= 115:
        raise ValueError("CPU temperature is unavailable or invalid")
    if temperature >= 95:
        return 100.0
    anchors = [{"temperature": 0, "fanRPMpercent": 0}, *points,
               {"temperature": 100, "fanRPMpercent": 100}]
    for left, right in zip(anchors, anchors[1:]):
        if left["temperature"] <= temperature <= right["temperature"]:
            span = right["temperature"] - left["temperature"]
            value = right["fanRPMpercent"] if span == 0 else (
                left["fanRPMpercent"] + (right["fanRPMpercent"] - left["fanRPMpercent"])
                * (temperature - left["temperature"]) / span)
            return max(10.0, value)
    return 100.0


def read_json(path):
    if path.stat().st_size > 2 * 1024 * 1024:
        raise ValueError("Settings file is too large")
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise ValueError("Invalid settings file")
    return value


def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as output:
            json.dump(value, output, allow_nan=False)
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


class FanSettings:
    def __init__(self, directory):
        self.path = Path(directory) / "fan-control.json"

    @contextmanager
    def locked(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.with_suffix(".lock").open("a") as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            yield

    def read(self):
        if not self.path.exists():
            return default_settings()
        return normalize_settings(read_json(self.path))

    def write(self, data):
        data = normalize_settings(data)
        if self.path.exists():
            try:
                original = read_json(self.path)
            except ValueError:
                # fail() must still be able to repair malformed JSON to System Auto.
                original = {}
            if original.get('version') in (1, 2, 3):
                # Keep every old curve in an exact backup before the one-way upgrade.
                backup = self.path.with_name(f"fan-control.v{original['version']}.json")
                if not backup.exists():
                    with backup.open('xb') as output:
                        output.write(self.path.read_bytes())
                        output.flush()
                        os.fsync(output.fileno())
        atomic_json(self.path, data)
        return data

    def migrate(self):
        with self.locked():
            if not self.path.exists():
                return
            original = read_json(self.path)
            data = normalize_settings(original)
            if data != original:
                data['revision'] += 1
                self.write(data)

    def edit(self, revision, mutation):
        with self.locked():
            data = self.read()
            if type(revision) is not int or data['revision'] != revision:
                raise ValueError('Fan settings changed; try again')
            mutation(data)
            data['revision'] += 1
            return self.write(data)

    def update(self, **changes):
        with self.locked():
            data = self.read()
            data.update(changes)
            data['revision'] += 1
            return self.write(data)

    def save_curve(self, curve, revision):
        points = validate_curve(curve)
        return self.edit(revision, lambda data: data.update(curve=points))

    def fail(self, reason):
        # Also repair malformed settings after handing control back to firmware.
        with self.locked():
            try:
                data = self.read()
            except (OSError, ValueError, TypeError, KeyError):
                data = default_settings()
            data.update(mode='auto', error=reason, revision=data['revision'] + 1)
            self.write(data)


def powercontrol_curves(homebrew):
    path = Path(homebrew) / "settings/PowerControl/config.json"
    if not path.exists():
        return []
    settings = read_json(path).get("PowerControl", {})
    if not isinstance(settings, dict):
        raise ValueError("PowerControl fan profiles could not be read")
    profiles = settings.get("fanSettings", {})
    if not isinstance(profiles, dict):
        raise ValueError("PowerControl fan profiles could not be read")
    result = []
    for name, profile in profiles.items():
        if not isinstance(name, str) or not isinstance(profile, dict) or profile.get("fanMode") != "CURVE":
            continue
        try:
            result.append({"name": name, "curve": validate_curve(profile.get("curvePoints"))})
        except ValueError:
            continue
    return sorted(result, key=lambda profile: profile["name"])
