import importlib
import os
import sys
import unittest
from pathlib import Path
from types import ModuleType
from unittest.mock import patch


PY_MODULES_PATH = Path(__file__).resolve().parents[1] / "py_modules"
sys.path.insert(0, str(PY_MODULES_PATH))


class FakeSettingsManager:
    def __init__(self, name, settings_directory):
        self.name = name
        self.settings_directory = settings_directory
        self.settings = {}
        self.persisted_settings = {}

    def read(self):
        self.settings = dict(self.persisted_settings)

    def setSetting(self, name, value):
        self.settings[name] = value

    def commit(self):
        self.persisted_settings = dict(self.settings)


class LegacyLayoutSettingsTests(unittest.TestCase):
    def setUp(self):
        settings_module = ModuleType("settings")
        settings_module.SettingsManager = FakeSettingsManager
        self.module_patches = (
            patch.dict(sys.modules, {"settings": settings_module}),
            patch.dict(os.environ, {"DECKY_PLUGIN_SETTINGS_DIR": "/tmp/deckyzone-test"}),
        )
        for module_patch in self.module_patches:
            module_patch.start()

        sys.modules.pop("plugin_settings", None)
        self.plugin_settings = importlib.import_module("plugin_settings")

    def tearDown(self):
        sys.modules.pop("plugin_settings", None)
        for module_patch in reversed(self.module_patches):
            module_patch.stop()

    def test_legacy_layout_defaults_to_disabled_and_persists_changes(self):
        self.assertFalse(self.plugin_settings.get_legacy_layout_enabled())

        self.assertTrue(self.plugin_settings.set_legacy_layout_enabled(1))
        self.assertTrue(self.plugin_settings.get_legacy_layout_enabled())
        self.assertEqual(
            self.plugin_settings.setting_file.persisted_settings[
                self.plugin_settings.LEGACY_LAYOUT_ENABLED_KEY
            ],
            True,
        )

        self.assertFalse(self.plugin_settings.set_legacy_layout_enabled(0))
        self.assertFalse(self.plugin_settings.get_legacy_layout_enabled())

    def test_reset_restores_legacy_layout_default(self):
        self.plugin_settings.set_legacy_layout_enabled(True)

        self.plugin_settings.reset_settings()

        self.assertFalse(self.plugin_settings.get_legacy_layout_enabled())


if __name__ == "__main__":
    unittest.main()
