from copy import deepcopy
import os

from settings import SettingsManager
import trackpad_modes
import controller_mappings


STARTUP_APPLY_KEY = "startupApplyEnabled"
HOME_BUTTON_ENABLED_KEY = "homeButtonEnabled"
TRACKPAD_MODE_KEY = "trackpadMode"
LEGACY_TRACKPADS_DISABLED_KEY = "trackpadsDisabled"
ZOTAC_GLYPHS_ENABLED_KEY = "zotacGlyphsEnabled"
HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY = "hideUnsupportedButtonsEnabled"
REMAINING_BATTERY_TIME_FIX_ENABLED_KEY = "remainingBatteryTimeFixEnabled"
LEGACY_LAYOUT_ENABLED_KEY = "legacyLayoutEnabled"
RUMBLE_ENABLED_KEY = "rumbleEnabled"
RUMBLE_INTENSITY_KEY = "rumbleIntensity"
PER_GAME_SETTINGS_KEY = "perGameSettings"
LEGACY_MISSING_GLYPH_FIX_GAMES_KEY = "missingGlyphFixGames"
ENABLED_KEY = "enabled"
BUTTON_PROMPT_FIX_ENABLED_KEY = "buttonPromptFixEnabled"
PER_GAME_TRACKPAD_MODE_KEY = "trackpadMode"
PER_GAME_RUMBLE_ENABLED_KEY = "rumbleEnabled"
PER_GAME_RUMBLE_INTENSITY_KEY = "rumbleIntensity"
LEGACY_DISABLE_TRACKPADS_KEY = "disableTrackpads"
M1_REMAP_TARGET_KEY = "m1RemapTarget"
M2_REMAP_TARGET_KEY = "m2RemapTarget"
DEFAULT_HOME_BUTTON_ENABLED = False
DEFAULT_TRACKPAD_MODE = trackpad_modes.DEFAULT_TRACKPAD_MODE
DEFAULT_ZOTAC_GLYPHS_ENABLED = False
DEFAULT_HIDE_UNSUPPORTED_BUTTONS_ENABLED = False
DEFAULT_REMAINING_BATTERY_TIME_FIX_ENABLED = False
DEFAULT_LEGACY_LAYOUT_ENABLED = False
DEFAULT_RUMBLE_ENABLED = False
DEFAULT_RUMBLE_INTENSITY = 75
DEFAULT_PER_GAME_REMAP_TARGET = "none"
VALID_PER_GAME_REMAP_TARGETS = {
    DEFAULT_PER_GAME_REMAP_TARGET,
    "a",
    "b",
    "x",
    "y",
    "select",
    "start",
    "lb",
    "rb",
    "lt",
    "rt",
    "ls",
    "rs",
    "dpad_up",
    "dpad_down",
    "dpad_left",
    "dpad_right",
}


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


def reset_settings():
    setting_file.read()
    setting_file.settings = {}
    setting_file.commit()
    return {}


def _normalize_global_trackpad_mode(settings):
    return trackpad_modes.normalize_trackpad_mode(
        settings.get(TRACKPAD_MODE_KEY),
        legacy_disabled=bool(
            settings.get(
                LEGACY_TRACKPADS_DISABLED_KEY,
                trackpad_modes.is_trackpad_mode_disabled(DEFAULT_TRACKPAD_MODE),
            )
        ),
    )


def _normalize_global_rumble_enabled(settings):
    return bool(settings.get(RUMBLE_ENABLED_KEY, DEFAULT_RUMBLE_ENABLED))


def _normalize_global_rumble_intensity(settings):
    return int(settings.get(RUMBLE_INTENSITY_KEY, DEFAULT_RUMBLE_INTENSITY))


def _default_per_game_settings_entry(settings=None):
    settings = settings or _read_settings()
    return {
        ENABLED_KEY: False,
        BUTTON_PROMPT_FIX_ENABLED_KEY: False,
        PER_GAME_TRACKPAD_MODE_KEY: _normalize_global_trackpad_mode(settings),
        PER_GAME_RUMBLE_ENABLED_KEY: _normalize_global_rumble_enabled(settings),
        PER_GAME_RUMBLE_INTENSITY_KEY: _normalize_global_rumble_intensity(settings),
        M1_REMAP_TARGET_KEY: DEFAULT_PER_GAME_REMAP_TARGET,
        M2_REMAP_TARGET_KEY: DEFAULT_PER_GAME_REMAP_TARGET,
    }


def _normalize_per_game_remap_target(target):
    normalized_target = str(target or "").strip().lower()
    if normalized_target in VALID_PER_GAME_REMAP_TARGETS:
        return normalized_target

    return DEFAULT_PER_GAME_REMAP_TARGET


def _normalize_legacy_missing_glyph_fix_entry(entry, settings):
    if entry is True:
        return {
            ENABLED_KEY: True,
            BUTTON_PROMPT_FIX_ENABLED_KEY: True,
            PER_GAME_TRACKPAD_MODE_KEY: trackpad_modes.TRACKPAD_MODE_DISABLED,
            PER_GAME_RUMBLE_ENABLED_KEY: _normalize_global_rumble_enabled(settings),
            PER_GAME_RUMBLE_INTENSITY_KEY: _normalize_global_rumble_intensity(settings),
            M1_REMAP_TARGET_KEY: DEFAULT_PER_GAME_REMAP_TARGET,
            M2_REMAP_TARGET_KEY: DEFAULT_PER_GAME_REMAP_TARGET,
        }

    if isinstance(entry, dict):
        return {
            ENABLED_KEY: True,
            BUTTON_PROMPT_FIX_ENABLED_KEY: True,
            PER_GAME_TRACKPAD_MODE_KEY: trackpad_modes.normalize_trackpad_mode(
                entry.get(PER_GAME_TRACKPAD_MODE_KEY),
                legacy_disabled=bool(entry.get(LEGACY_DISABLE_TRACKPADS_KEY, True)),
            ),
            PER_GAME_RUMBLE_ENABLED_KEY: bool(
                entry.get(
                    PER_GAME_RUMBLE_ENABLED_KEY,
                    _normalize_global_rumble_enabled(settings),
                )
            ),
            PER_GAME_RUMBLE_INTENSITY_KEY: int(
                entry.get(
                    PER_GAME_RUMBLE_INTENSITY_KEY,
                    _normalize_global_rumble_intensity(settings),
                )
            ),
            M1_REMAP_TARGET_KEY: _normalize_per_game_remap_target(
                entry.get(M1_REMAP_TARGET_KEY)
            ),
            M2_REMAP_TARGET_KEY: _normalize_per_game_remap_target(
                entry.get(M2_REMAP_TARGET_KEY)
            ),
        }

    return None


def _without_game_home_button(profile):
    if not isinstance(profile, dict):
        return profile
    return {key: value for key, value in profile.items() if key != "buttons"}


def _normalize_per_game_settings_entry(entry, settings):
    if not isinstance(entry, dict):
        return _normalize_legacy_missing_glyph_fix_entry(entry, settings)

    if ENABLED_KEY not in entry and BUTTON_PROMPT_FIX_ENABLED_KEY not in entry:
        return _normalize_legacy_missing_glyph_fix_entry(entry, settings)

    return {
        "controllerMapping": controller_mappings.normalize(
            _without_game_home_button(entry.get("controllerMapping"))
        ),
        ENABLED_KEY: bool(entry.get(ENABLED_KEY, False)),
        BUTTON_PROMPT_FIX_ENABLED_KEY: bool(
            entry.get(BUTTON_PROMPT_FIX_ENABLED_KEY, False)
        ),
        PER_GAME_TRACKPAD_MODE_KEY: trackpad_modes.normalize_trackpad_mode(
            entry.get(PER_GAME_TRACKPAD_MODE_KEY),
            legacy_disabled=bool(entry.get(LEGACY_DISABLE_TRACKPADS_KEY, False)),
        ),
        PER_GAME_RUMBLE_ENABLED_KEY: bool(
            entry.get(
                PER_GAME_RUMBLE_ENABLED_KEY,
                _normalize_global_rumble_enabled(settings),
            )
        ),
        PER_GAME_RUMBLE_INTENSITY_KEY: int(
            entry.get(
                PER_GAME_RUMBLE_INTENSITY_KEY,
                _normalize_global_rumble_intensity(settings),
            )
        ),
        M1_REMAP_TARGET_KEY: _normalize_per_game_remap_target(
            entry.get(M1_REMAP_TARGET_KEY)
        ),
        M2_REMAP_TARGET_KEY: _normalize_per_game_remap_target(
            entry.get(M2_REMAP_TARGET_KEY)
        ),
    }


def get_home_button_enabled():
    return get_home_button_action("0") == "steam_home"


def get_brightness_dial_fix_enabled():
    # Compatibility value for older frontends; brightness support is automatic.
    return True


def get_trackpad_mode():
    settings = _read_settings()
    return _normalize_global_trackpad_mode(settings)


def set_trackpad_mode(mode):
    normalized_mode = trackpad_modes.normalize_trackpad_mode(mode)
    _write_setting(TRACKPAD_MODE_KEY, normalized_mode)
    return get_trackpad_mode()


def get_trackpads_disabled():
    return trackpad_modes.is_trackpad_mode_disabled(get_trackpad_mode())


def set_trackpads_disabled(disabled):
    return set_trackpad_mode(
        trackpad_modes.TRACKPAD_MODE_DISABLED if disabled else trackpad_modes.TRACKPAD_MODE_DEFAULT
    )


def get_zotac_glyphs_enabled():
    settings = _read_settings()
    return bool(settings.get(ZOTAC_GLYPHS_ENABLED_KEY, DEFAULT_ZOTAC_GLYPHS_ENABLED))


def set_zotac_glyphs_enabled(enabled):
    _write_setting(ZOTAC_GLYPHS_ENABLED_KEY, bool(enabled))
    return get_zotac_glyphs_enabled()


def get_hide_unsupported_buttons_enabled():
    settings = _read_settings()
    return bool(
        settings.get(
            HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY,
            DEFAULT_HIDE_UNSUPPORTED_BUTTONS_ENABLED,
        )
    )


def set_hide_unsupported_buttons_enabled(enabled):
    _write_setting(HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY, bool(enabled))
    return get_hide_unsupported_buttons_enabled()


def migrate_startup_apply_setting():
    settings = _read_settings()
    if STARTUP_APPLY_KEY not in settings:
        return False

    del setting_file.settings[STARTUP_APPLY_KEY]
    setting_file.commit()
    return True


def migrate_hide_unsupported_buttons_setting():
    settings = _read_settings()
    if HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY in settings:
        return bool(settings[HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY])

    return bool(
        _write_setting(
            HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY,
            bool(
                settings.get(
                    ZOTAC_GLYPHS_ENABLED_KEY,
                    DEFAULT_ZOTAC_GLYPHS_ENABLED,
                )
            ),
        )
    )


def get_remaining_battery_time_fix_enabled():
    settings = _read_settings()
    return bool(
        settings.get(
            REMAINING_BATTERY_TIME_FIX_ENABLED_KEY,
            DEFAULT_REMAINING_BATTERY_TIME_FIX_ENABLED,
        )
    )


def set_remaining_battery_time_fix_enabled(enabled):
    _write_setting(REMAINING_BATTERY_TIME_FIX_ENABLED_KEY, bool(enabled))
    return get_remaining_battery_time_fix_enabled()


def get_legacy_layout_enabled():
    settings = _read_settings()
    return bool(
        settings.get(LEGACY_LAYOUT_ENABLED_KEY, DEFAULT_LEGACY_LAYOUT_ENABLED)
    )


def set_legacy_layout_enabled(enabled):
    _write_setting(LEGACY_LAYOUT_ENABLED_KEY, bool(enabled))
    return get_legacy_layout_enabled()


def get_rumble_enabled():
    settings = _read_settings()
    return _normalize_global_rumble_enabled(settings)


def set_rumble_enabled(enabled):
    _write_setting(RUMBLE_ENABLED_KEY, bool(enabled))
    return get_rumble_enabled()


def get_rumble_intensity():
    settings = _read_settings()
    return _normalize_global_rumble_intensity(settings)


def set_rumble_intensity(intensity):
    _write_setting(RUMBLE_INTENSITY_KEY, int(intensity))
    return get_rumble_intensity()


def get_per_game_settings():
    settings = _read_settings()
    normalized_games = {}
    games = settings.get(PER_GAME_SETTINGS_KEY, {})
    if isinstance(games, dict):
        for app_id, entry in games.items():
            normalized_entry = _normalize_per_game_settings_entry(entry, settings)
            if normalized_entry is None:
                continue

            normalized_games[str(app_id)] = normalized_entry

    legacy_games = settings.get(LEGACY_MISSING_GLYPH_FIX_GAMES_KEY, {})
    if isinstance(legacy_games, dict):
        for app_id, entry in legacy_games.items():
            normalized_app_id = str(app_id)
            if normalized_app_id in normalized_games:
                continue

            normalized_entry = _normalize_legacy_missing_glyph_fix_entry(entry, settings)
            if normalized_entry is None:
                continue

            normalized_games[normalized_app_id] = normalized_entry

    return normalized_games


def get_per_game_settings_enabled(app_id):
    if app_id is None:
        return False

    entry = get_per_game_settings().get(str(app_id))
    if not entry:
        return False

    return bool(entry.get(ENABLED_KEY, False))


def get_button_prompt_fix_enabled(app_id):
    if app_id is None:
        return False

    entry = get_per_game_settings().get(str(app_id))
    if not entry:
        return False

    return bool(entry.get(BUTTON_PROMPT_FIX_ENABLED_KEY, False))


def get_per_game_trackpad_mode(app_id):
    if app_id is None:
        return DEFAULT_TRACKPAD_MODE

    entry = get_per_game_settings().get(str(app_id))
    if not entry:
        return DEFAULT_TRACKPAD_MODE

    return trackpad_modes.normalize_trackpad_mode(
        entry.get(PER_GAME_TRACKPAD_MODE_KEY),
        legacy_disabled=bool(entry.get(LEGACY_DISABLE_TRACKPADS_KEY, False)),
    )


def get_effective_trackpad_mode(app_id=None):
    global_mode = get_trackpad_mode()
    normalized_app_id = str(app_id or "0")
    if normalized_app_id == "0" or not get_per_game_settings_enabled(normalized_app_id):
        return global_mode

    return get_per_game_trackpad_mode(normalized_app_id)


def is_startup_controller_runtime_required(app_id=None):
    # Default dial brightness needs the keyboard target even without a saved mapping.
    return True


def is_controller_runtime_required(app_id=None):
    normalized_app_id = str(app_id or "0")
    return bool(
        is_startup_controller_runtime_required(normalized_app_id)
        or (
            normalized_app_id != "0"
            and get_per_game_settings_enabled(normalized_app_id)
            and get_button_prompt_fix_enabled(normalized_app_id)
        )
    )


def get_per_game_trackpads_disabled(app_id):
    return trackpad_modes.is_trackpad_mode_disabled(get_per_game_trackpad_mode(app_id))


def get_per_game_rumble_enabled(app_id):
    if app_id is None:
        return DEFAULT_RUMBLE_ENABLED

    entry = get_per_game_settings().get(str(app_id))
    if not entry:
        return DEFAULT_RUMBLE_ENABLED

    return bool(entry.get(PER_GAME_RUMBLE_ENABLED_KEY, DEFAULT_RUMBLE_ENABLED))


def get_per_game_rumble_intensity(app_id):
    if app_id is None:
        return DEFAULT_RUMBLE_INTENSITY

    entry = get_per_game_settings().get(str(app_id))
    if not entry:
        return DEFAULT_RUMBLE_INTENSITY

    return int(entry.get(PER_GAME_RUMBLE_INTENSITY_KEY, DEFAULT_RUMBLE_INTENSITY))


def get_per_game_m1_remap_target(app_id):
    if app_id is None:
        return DEFAULT_PER_GAME_REMAP_TARGET

    entry = get_per_game_settings().get(str(app_id))
    if not entry:
        return DEFAULT_PER_GAME_REMAP_TARGET

    return _normalize_per_game_remap_target(
        entry.get(M1_REMAP_TARGET_KEY, DEFAULT_PER_GAME_REMAP_TARGET)
    )


def get_per_game_m2_remap_target(app_id):
    if app_id is None:
        return DEFAULT_PER_GAME_REMAP_TARGET

    entry = get_per_game_settings().get(str(app_id))
    if not entry:
        return DEFAULT_PER_GAME_REMAP_TARGET

    return _normalize_per_game_remap_target(
        entry.get(M2_REMAP_TARGET_KEY, DEFAULT_PER_GAME_REMAP_TARGET)
    )


def validate_game_settings_app_id(app_id):
    app_id = controller_mappings.app_id(app_id)
    if app_id == "0":
        raise ValueError("A game ID is required.")
    return app_id


def validate_game_controller_settings_patch(patch):
    if not isinstance(patch, dict) or not patch:
        raise ValueError("Controller settings must contain at least one change.")
    boolean_keys = {ENABLED_KEY, BUTTON_PROMPT_FIX_ENABLED_KEY, PER_GAME_RUMBLE_ENABLED_KEY}
    for key, value in patch.items():
        if key in boolean_keys:
            if type(value) is not bool:
                raise ValueError(f"{key} must be a boolean.")
        elif key == PER_GAME_RUMBLE_INTENSITY_KEY:
            if type(value) is not int or not 0 <= value <= 100:
                raise ValueError("Rumble intensity must be an integer from 0 to 100.")
        else:
            raise ValueError(f"Unknown controller setting: {key}.")
    return dict(patch)


def snapshot_game_settings(app_id):
    settings = _read_settings()
    snapshot = {}
    for key in (PER_GAME_SETTINGS_KEY, LEGACY_MISSING_GLYPH_FIX_GAMES_KEY):
        games = settings.get(key, {})
        snapshot[key] = {
            "groupPresent": key in settings,
            "present": isinstance(games, dict) and app_id in games,
            "entry": deepcopy(games.get(app_id)) if isinstance(games, dict) else None,
        }
    return snapshot


def restore_game_settings(app_id, snapshot):
    settings = _read_settings()
    for key, previous in snapshot.items():
        games = dict(settings.get(key) or {})
        if previous["present"]:
            games[app_id] = deepcopy(previous["entry"])
        else:
            games.pop(app_id, None)
        if games or previous["groupPresent"]:
            settings[key] = games
        else:
            settings.pop(key, None)
    setting_file.commit()


def update_game_controller_settings(app_id, patch):
    app_id = validate_game_settings_app_id(app_id)
    patch = validate_game_controller_settings_patch(patch)
    entry = get_per_game_settings().get(app_id)
    if entry is None and patch == {ENABLED_KEY: False}:
        return
    settings = _read_settings()
    games = dict(settings.get(PER_GAME_SETTINGS_KEY) or {})
    raw_entry = games.get(app_id)
    current_entry = dict(entry or _default_per_game_settings_entry(settings))
    if isinstance(raw_entry, dict):
        current_entry.update(raw_entry)
    if "controllerMapping" in current_entry:
        current_entry["controllerMapping"] = _without_game_home_button(
            current_entry["controllerMapping"]
        )
    current_entry.update(patch)
    if ENABLED_KEY not in patch:
        current_entry[ENABLED_KEY] = True
    games[app_id] = current_entry
    _write_setting(PER_GAME_SETTINGS_KEY, games)


def remove_game_settings(app_id):
    app_id = validate_game_settings_app_id(app_id)
    settings = _read_settings()
    for key in (PER_GAME_SETTINGS_KEY, LEGACY_MISSING_GLYPH_FIX_GAMES_KEY):
        games = settings.get(key)
        if isinstance(games, dict):
            games.pop(app_id, None)
    setting_file.commit()


def set_per_game_settings_enabled(app_id, enabled):
    if app_id is None:
        return get_per_game_settings()

    games = get_per_game_settings()
    settings = _read_settings()
    app_id = str(app_id)
    entry = games.get(app_id)
    if entry is None and not enabled:
        return get_per_game_settings()

    current_entry = dict(entry or _default_per_game_settings_entry(settings))
    current_entry[ENABLED_KEY] = bool(enabled)
    games[app_id] = current_entry

    _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_per_game_settings()


def set_button_prompt_fix_enabled(app_id, enabled):
    if app_id is None:
        return get_per_game_settings()

    games = get_per_game_settings()
    settings = _read_settings()
    app_id = str(app_id)
    entry = games.get(app_id)
    if entry is None and not enabled:
        return get_per_game_settings()

    current_entry = dict(entry or _default_per_game_settings_entry(settings))
    if enabled:
        current_entry[ENABLED_KEY] = True
    current_entry[BUTTON_PROMPT_FIX_ENABLED_KEY] = bool(enabled)
    games[app_id] = current_entry

    _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_per_game_settings()


def set_per_game_trackpad_mode(app_id, mode):
    if app_id is None:
        return get_per_game_settings()

    games = get_per_game_settings()
    app_id = str(app_id)
    entry = games.get(app_id)
    if not entry:
        return get_per_game_settings()

    current_entry = dict(entry)
    current_entry[PER_GAME_TRACKPAD_MODE_KEY] = trackpad_modes.normalize_trackpad_mode(
        mode
    )
    games[app_id] = current_entry

    _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_per_game_settings()


def set_per_game_trackpads_disabled(app_id, disabled):
    return set_per_game_trackpad_mode(
        app_id,
        trackpad_modes.TRACKPAD_MODE_DISABLED if disabled else trackpad_modes.TRACKPAD_MODE_DEFAULT,
    )


def set_per_game_rumble_enabled(app_id, enabled):
    if app_id is None:
        return get_per_game_settings()

    games = get_per_game_settings()
    app_id = str(app_id)
    entry = games.get(app_id)
    if not entry:
        return get_per_game_settings()

    current_entry = dict(entry)
    current_entry[PER_GAME_RUMBLE_ENABLED_KEY] = bool(enabled)
    games[app_id] = current_entry

    _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_per_game_settings()


def set_per_game_rumble_intensity(app_id, intensity):
    if app_id is None:
        return get_per_game_settings()

    games = get_per_game_settings()
    app_id = str(app_id)
    entry = games.get(app_id)
    if not entry:
        return get_per_game_settings()

    current_entry = dict(entry)
    current_entry[PER_GAME_RUMBLE_INTENSITY_KEY] = max(0, min(100, int(intensity)))
    games[app_id] = current_entry

    _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_per_game_settings()


def set_per_game_m1_remap_target(app_id, target):
    if app_id is None:
        return get_per_game_settings()

    games = get_per_game_settings()
    app_id = str(app_id)
    entry = games.get(app_id)
    if not entry:
        return get_per_game_settings()

    current_entry = dict(entry)
    current_entry[M1_REMAP_TARGET_KEY] = _normalize_per_game_remap_target(target)
    games[app_id] = current_entry

    _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_per_game_settings()


def set_per_game_m2_remap_target(app_id, target):
    if app_id is None:
        return get_per_game_settings()

    games = get_per_game_settings()
    app_id = str(app_id)
    entry = games.get(app_id)
    if not entry:
        return get_per_game_settings()

    current_entry = dict(entry)
    current_entry[M2_REMAP_TARGET_KEY] = _normalize_per_game_remap_target(target)
    games[app_id] = current_entry

    _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_per_game_settings()


def get_missing_glyph_fix_games():
    legacy_games = {}
    for app_id, entry in get_per_game_settings().items():
        if not entry.get(ENABLED_KEY) or not entry.get(BUTTON_PROMPT_FIX_ENABLED_KEY):
            continue

        legacy_games[app_id] = {
            LEGACY_DISABLE_TRACKPADS_KEY: trackpad_modes.is_trackpad_mode_disabled(
                entry.get(PER_GAME_TRACKPAD_MODE_KEY)
            )
        }

    return legacy_games


def get_missing_glyph_fix_enabled(app_id):
    return get_button_prompt_fix_enabled(app_id)


def get_missing_glyph_fix_trackpads_disabled(app_id):
    return get_per_game_trackpads_disabled(app_id)


def set_missing_glyph_fix_enabled(app_id, enabled):
    return set_button_prompt_fix_enabled(app_id, enabled)


def set_missing_glyph_fix_trackpads_disabled(app_id, disabled):
    return set_per_game_trackpads_disabled(app_id, disabled)


def has_custom_controller_mappings():
    return get_effective_controller_mapping("0") is not None or any(
        entry.get(ENABLED_KEY) and entry.get("controllerMapping") is not None
        for entry in get_per_game_settings().values()
    )


def get_effective_controller_mapping(app_id=None):
    settings = _read_settings()
    global_profile = controller_mappings.normalize(settings.get("controllerMapping"))
    entry = get_per_game_settings().get(str(app_id or "0"), {})
    home = _global_home_action(settings, global_profile)
    if entry.get(ENABLED_KEY) and entry.get("controllerMapping") is not None:
        return _resolve_mapping_buttons(entry["controllerMapping"], home)
    return _resolve_mapping_buttons(global_profile, home)


def _global_home_action(settings, global_profile):
    if global_profile is not None and "buttons" in global_profile:
        return global_profile["buttons"]["home"]
    return (
        "steam_home"
        if settings.get(HOME_BUTTON_ENABLED_KEY, DEFAULT_HOME_BUTTON_ENABLED)
        else "screenshot"
    )


def _resolve_mapping_buttons(profile, home):
    if profile is None:
        return None
    return {**profile, "buttons": {"home": home}}


def get_home_button_action(app_id=None):
    settings = _read_settings()
    profile = controller_mappings.normalize(settings.get("controllerMapping"))
    return _global_home_action(settings, profile)


def get_controller_mapping(app_id):
    app_id = controller_mappings.app_id(app_id)
    settings = _read_settings()
    global_profile = controller_mappings.normalize(settings.get("controllerMapping"))
    has_global_mapping = global_profile is not None
    home = _global_home_action(settings, global_profile)
    if global_profile is None:
        global_profile = controller_mappings.defaults(_normalize_global_trackpad_mode(settings))
        global_profile["buttons"]["home"] = home
    else:
        global_profile = _resolve_mapping_buttons(global_profile, home)
    entry = get_per_game_settings().get(app_id, {})
    enabled = app_id == "0" or bool(entry.get(ENABLED_KEY))
    profile = entry.get("controllerMapping") if app_id != "0" else None
    if profile is None and not has_global_mapping and enabled and app_id != "0" and entry.get(PER_GAME_TRACKPAD_MODE_KEY) != settings.get(TRACKPAD_MODE_KEY, DEFAULT_TRACKPAD_MODE):
        profile = controller_mappings.defaults(entry[PER_GAME_TRACKPAD_MODE_KEY])
        profile["buttons"]["home"] = home
    return {
        "appId": app_id,
        "enabled": enabled,
        "profile": _resolve_mapping_buttons(profile, home) or global_profile,
    }


def set_controller_mapping(app_id, profile, enabled=True):
    app_id = controller_mappings.app_id(app_id)
    if profile is not None:
        if app_id != "0":
            profile = _without_game_home_button(profile)
        profile = controller_mappings.validate(profile)
    if app_id == "0":
        _write_setting("controllerMapping", profile)
    else:
        games = get_per_game_settings()
        entry = dict(games.get(app_id) or _default_per_game_settings_entry())
        entry["controllerMapping"] = profile
        entry[ENABLED_KEY] = bool(enabled)
        games[app_id] = entry
        _write_setting(PER_GAME_SETTINGS_KEY, games)
    return get_controller_mapping(app_id)
