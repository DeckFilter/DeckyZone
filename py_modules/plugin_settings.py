import os

from settings import SettingsManager


STARTUP_APPLY_KEY = "startupApplyEnabled"
RUMBLE_ENABLED_KEY = "rumbleEnabled"
RUMBLE_INTENSITY_KEY = "rumbleIntensity"
MISSING_GLYPH_FIX_GAMES_KEY = "missingGlyphFixGames"
DEFAULT_STARTUP_APPLY_ENABLED = True
DEFAULT_RUMBLE_ENABLED = True
DEFAULT_RUMBLE_INTENSITY = 75


settings_directory = os.environ["DECKY_PLUGIN_SETTINGS_DIR"]
setting_file = SettingsManager(name="settings", settings_directory=settings_directory)
setting_file.read()


def _read_settings():
    setting_file.read()
    return setting_file.settings


def _write_setting(name, value):
    setting_file.setSetting(name, value)
    setting_file.commit()
    return value


def get_startup_apply_enabled():
    settings = _read_settings()
    return bool(settings.get(STARTUP_APPLY_KEY, DEFAULT_STARTUP_APPLY_ENABLED))


def set_startup_apply_enabled(enabled):
    _write_setting(STARTUP_APPLY_KEY, bool(enabled))
    return get_startup_apply_enabled()


def get_rumble_enabled():
    settings = _read_settings()
    return bool(settings.get(RUMBLE_ENABLED_KEY, DEFAULT_RUMBLE_ENABLED))


def set_rumble_enabled(enabled):
    _write_setting(RUMBLE_ENABLED_KEY, bool(enabled))
    return get_rumble_enabled()


def get_rumble_intensity():
    settings = _read_settings()
    return int(settings.get(RUMBLE_INTENSITY_KEY, DEFAULT_RUMBLE_INTENSITY))


def set_rumble_intensity(intensity):
    _write_setting(RUMBLE_INTENSITY_KEY, int(intensity))
    return get_rumble_intensity()


def get_missing_glyph_fix_games():
    settings = _read_settings()
    games = settings.get(MISSING_GLYPH_FIX_GAMES_KEY, {})
    if not isinstance(games, dict):
        return {}

    return {
        str(app_id): True
        for app_id, enabled in games.items()
        if enabled
    }


def get_missing_glyph_fix_enabled(app_id):
    if app_id is None:
        return False

    return bool(get_missing_glyph_fix_games().get(str(app_id), False))


def set_missing_glyph_fix_enabled(app_id, enabled):
    games = get_missing_glyph_fix_games()
    app_id = str(app_id)

    if enabled:
        games[app_id] = True
    else:
        games.pop(app_id, None)

    _write_setting(MISSING_GLYPH_FIX_GAMES_KEY, games)
    return get_missing_glyph_fix_games()
