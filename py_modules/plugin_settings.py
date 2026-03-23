import os

from settings import SettingsManager


SETTINGS_KEY = "startupApplyEnabled"
DEFAULT_STARTUP_APPLY_ENABLED = True


settings_directory = os.environ["DECKY_PLUGIN_SETTINGS_DIR"]
setting_file = SettingsManager(name="settings", settings_directory=settings_directory)
setting_file.read()


def get_startup_apply_enabled():
    setting_file.read()
    return bool(setting_file.settings.get(SETTINGS_KEY, DEFAULT_STARTUP_APPLY_ENABLED))


def set_startup_apply_enabled(enabled):
    setting_file.setSetting(SETTINGS_KEY, bool(enabled))
    return get_startup_apply_enabled()
