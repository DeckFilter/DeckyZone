"""Global fan settings and PowerControl's curve-only import boundary."""

from contextlib import contextmanager
from copy import deepcopy
import fcntl
import json
import math
import os
from pathlib import Path
import tempfile
import uuid

# ONE Launcher 2.1.44: FanMode.GetDefault / Curve10 through Curve90.
DEFAULT_CURVE = [
    {"temperature": t, "fanRPMpercent": p}
    for t, p in ((10, 40), (20, 40), (30, 40), (40, 40), (50, 50),
                 (60, 60), (70, 80), (80, 90), (90, 100))
]
MAX_POINTS = 16
MAX_PROFILES = 16
DEFAULT_MANUAL_SPEED = 50


def profile_name(value):
    if not isinstance(value, str) or not value.strip() or len(value.strip()) > 40:
        raise ValueError('Use a curve name with 1–40 characters')
    value = value.strip()
    if any(ord(c) < 32 or ord(c) == 127 for c in value):
        raise ValueError('Curve names cannot contain control characters')
    if value.casefold() in ('auto', 'system auto'):
        raise ValueError('System Auto is reserved for firmware cooling')
    return value


def available_name(profiles, preferred):
    try:
        name = profile_name(preferred[:40])
    except ValueError:
        name = 'Custom curve'
    names = {p['name'].casefold() for p in profiles}
    candidate, suffix = name, 2
    while candidate.casefold() in names:
        ending = f' ({suffix})'
        candidate = name[:40 - len(ending)] + ending
        suffix += 1
    return candidate


def normalize_settings(data):
    data = deepcopy(data)
    if data.get('version') not in (1, 2, 3):
        raise ValueError('Fan settings are invalid; reset the saved curves')
    if data.get('mode') not in (('auto', 'custom') if data['version'] < 3 else ('auto', 'manual', 'curve')):
        raise ValueError('Fan settings are invalid; reset the saved curves')
    if type(data.get('revision')) is not int or data['revision'] < 0:
        raise ValueError('Fan settings revision is invalid')
    if not isinstance(data.get('error', ''), str):
        raise ValueError('Fan settings metadata is invalid')
    if type(data.get('defaultCurveInitialized', False)) is not bool:
        raise ValueError('Fan settings metadata is invalid')
    if data['version'] == 1:
        source = data.get('source')
        if source is not None and not isinstance(source, str):
            raise ValueError('Fan settings metadata is invalid')
        data.update(version=2, selectedProfileId='default', profiles=[{
            'id': 'default', 'name': available_name([], source or 'Custom curve'),
            'curve': validate_curve(data.get('curve')),
        }])
    if data['version'] == 2:
        data.update(version=3, mode='curve' if data['mode'] == 'custom' else 'auto',
                    manualSpeed=DEFAULT_MANUAL_SPEED)
    data['manualSpeed'] = validate_manual_speed(data.get('manualSpeed'))
    profiles = data.get('profiles')
    if not isinstance(profiles, list) or len(profiles) > MAX_PROFILES:
        raise ValueError(f'Use at most {MAX_PROFILES} saved fan curves')
    ids, names = set(), set()
    for profile in profiles:
        if not isinstance(profile, dict):
            raise ValueError('Invalid fan profile')
        identity = profile.get('id')
        if (not isinstance(identity, str) or not 1 <= len(identity) <= 64
                or not all(c in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in identity)
                or identity == 'auto' or identity in ids):
            raise ValueError('Invalid fan profile ID')
        profile['name'] = profile_name(profile.get('name'))
        if profile['name'].casefold() in names:
            raise ValueError('Choose a different name; that curve already exists')
        ids.add(identity)
        names.add(profile['name'].casefold())
        profile.pop('source', None)
        profile['curve'] = validate_curve(profile.get('curve'))
    selected = data.get('selectedProfileId')
    if selected is not None and (not isinstance(selected, str) or selected not in ids):
        raise ValueError('The selected fan curve does not exist')
    if data['mode'] == 'curve' and selected is None:
        raise ValueError('Select a saved curve before enabling fan control')
    current = next((p for p in profiles if p['id'] == selected), None)
    # Derived compatibility fields let the supervised worker keep its existing
    # effective-curve contract without a second mutable copy in the settings.
    data['curve'] = deepcopy(current['curve'] if current else DEFAULT_CURVE)
    data['source'] = None
    return data


def default_settings():
    return normalize_settings({
        'version': 3, 'mode': 'auto', 'manualSpeed': DEFAULT_MANUAL_SPEED,
        'revision': 0, 'error': '', 'defaultCurveInitialized': True,
        'selectedProfileId': 'default',
        'profiles': [{'id': 'default', 'name': 'Default', 'curve': DEFAULT_CURVE}],
    })


def validate_manual_speed(value):
    if type(value) not in (int, float) or not math.isfinite(value) or not 10 <= value <= 100:
        raise ValueError('Fan speed must be between 10 and 100 percent')
    return value


def requested_speed(config, temperature):
    if config['mode'] == 'curve':
        return curve_speed(config['curve'], temperature)
    if config['mode'] != 'manual':
        raise ValueError('Select Manual or Curve before setting fan speed')
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
        stored = {k: v for k, v in data.items() if k not in ('curve', 'source')}
        atomic_json(self.path, stored)
        return data

    def migrate(self):
        with self.locked():
            if not self.path.exists():
                return
            original = read_json(self.path)
            data = self.read()
            if not data.get('defaultCurveInitialized', False):
                # Add once without changing existing curves or the active mode.
                # A full library stays intact; Add still uses DEFAULT_CURVE.
                if len(data['profiles']) < MAX_PROFILES:
                    self.add_profile(data, 'Default', DEFAULT_CURVE)
                data['defaultCurveInitialized'] = True
                data['revision'] += 1
            if original.get('version') in (1, 2):
                # Keep the exact original bytes before the one-way schema upgrade.
                backup = self.path.with_name(f"fan-control.v{original['version']}.json")
                if not backup.exists():
                    with backup.open('xb') as output:
                        output.write(self.path.read_bytes())
                        output.flush()
                        os.fsync(output.fileno())
            stored = {k: v for k, v in data.items() if k not in ('curve', 'source')}
            if stored != original:
                self.write(data)

    def edit(self, revision, mutation):
        with self.locked():
            data = self.read()
            if type(revision) is not int or data['revision'] != revision:
                raise ValueError('Fan settings changed; reopen the curve before saving')
            mutation(data)
            data['revision'] += 1
            return self.write(data)

    def update(self, **changes):
        with self.locked():
            data = self.read()
            data.update(changes)
            data['revision'] += 1
            return self.write(data)

    def save_profile(self, identity, name, curve, revision):
        points, name = validate_curve(curve), profile_name(name)
        def save(data):
            if identity is None:
                if len(data['profiles']) >= MAX_PROFILES:
                    raise ValueError(f'Use at most {MAX_PROFILES} saved fan curves')
                data['profiles'].append({'id': uuid.uuid4().hex, 'name': name, 'curve': points})
            else:
                profile = next((p for p in data['profiles'] if p['id'] == identity), None)
                if profile is None:
                    raise ValueError('That saved curve no longer exists')
                profile.update(name=name, curve=points)
        return self.edit(revision, save)

    def copy_profile(self, identity, revision):
        def copy(data):
            profile = next((p for p in data['profiles'] if p['id'] == identity), None)
            if profile is None:
                raise ValueError('That saved curve no longer exists')
            self.add_profile(data, profile['name'] + ' copy', profile['curve'])
        return self.edit(revision, copy)

    @staticmethod
    def add_profile(data, name, curve):
        if len(data['profiles']) >= MAX_PROFILES:
            raise ValueError(f'Use at most {MAX_PROFILES} saved fan curves')
        data['profiles'].append({'id': uuid.uuid4().hex, 'name': available_name(data['profiles'], name),
                                 'curve': validate_curve(curve)})

    def delete_profile(self, identity, revision):
        def delete(data):
            if not any(p['id'] == identity for p in data['profiles']):
                raise ValueError('That saved curve no longer exists')
            if data['mode'] == 'curve' and data['selectedProfileId'] == identity:
                data.update(mode='auto', error='')
            data['profiles'] = [p for p in data['profiles'] if p['id'] != identity]
            if data['selectedProfileId'] == identity:
                data['selectedProfileId'] = None
        return self.edit(revision, delete)

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
