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

    def test_hide_unsupported_buttons_defaults_to_disabled_and_persists_changes(self):
        self.assertFalse(self.plugin_settings.get_hide_unsupported_buttons_enabled())

        self.assertTrue(
            self.plugin_settings.set_hide_unsupported_buttons_enabled(True)
        )
        self.assertTrue(self.plugin_settings.get_hide_unsupported_buttons_enabled())
        self.assertEqual(
            self.plugin_settings.setting_file.persisted_settings[
                self.plugin_settings.HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY
            ],
            True,
        )

    def test_hide_unsupported_buttons_migration_preserves_existing_glyph_behavior(self):
        self.plugin_settings.setting_file.persisted_settings = {
            self.plugin_settings.ZOTAC_GLYPHS_ENABLED_KEY: True,
        }

        self.assertTrue(
            self.plugin_settings.migrate_hide_unsupported_buttons_setting()
        )
        self.assertEqual(
            self.plugin_settings.setting_file.persisted_settings[
                self.plugin_settings.HIDE_UNSUPPORTED_BUTTONS_ENABLED_KEY
            ],
            True,
        )

        self.plugin_settings.set_zotac_glyphs_enabled(False)
        self.assertTrue(
            self.plugin_settings.migrate_hide_unsupported_buttons_setting()
        )

    def test_controller_runtime_demand_tracks_global_features(self):
        self.assertFalse(
            self.plugin_settings.is_startup_controller_runtime_required()
        )

        self.plugin_settings.set_home_button_enabled(True)
        self.assertTrue(
            self.plugin_settings.is_startup_controller_runtime_required()
        )

        self.plugin_settings.set_home_button_enabled(False)
        self.plugin_settings.set_brightness_dial_fix_enabled(True)
        self.assertTrue(
            self.plugin_settings.is_startup_controller_runtime_required()
        )

        self.plugin_settings.set_brightness_dial_fix_enabled(False)
        self.plugin_settings.set_trackpad_mode("directional_buttons")
        self.assertTrue(
            self.plugin_settings.is_startup_controller_runtime_required()
        )

        self.plugin_settings.set_trackpad_mode("default")
        self.assertFalse(
            self.plugin_settings.is_startup_controller_runtime_required()
        )

    def test_controller_runtime_demand_uses_active_per_game_trackpad_mode(self):
        app_id = "1234"
        self.plugin_settings.set_per_game_settings_enabled(app_id, True)
        self.plugin_settings.set_per_game_trackpad_mode(
            app_id,
            "directional_buttons",
        )

        self.assertTrue(
            self.plugin_settings.is_startup_controller_runtime_required(app_id)
        )
        self.assertFalse(
            self.plugin_settings.is_startup_controller_runtime_required("5678")
        )

        self.plugin_settings.set_per_game_settings_enabled(app_id, False)
        self.assertFalse(
            self.plugin_settings.is_startup_controller_runtime_required(app_id)
        )

    def test_controller_runtime_demand_includes_active_button_prompt_override(self):
        app_id = "1234"
        self.plugin_settings.set_button_prompt_fix_enabled(app_id, True)

        self.assertTrue(
            self.plugin_settings.is_controller_runtime_required(app_id)
        )
        self.assertFalse(
            self.plugin_settings.is_controller_runtime_required("5678")
        )

        self.plugin_settings.set_per_game_settings_enabled(app_id, False)
        self.assertFalse(
            self.plugin_settings.is_controller_runtime_required(app_id)
        )

    def test_startup_apply_migration_removes_only_the_legacy_parent(self):
        self.plugin_settings.setting_file.persisted_settings = {
            self.plugin_settings.STARTUP_APPLY_KEY: True,
            self.plugin_settings.HOME_BUTTON_ENABLED_KEY: True,
            self.plugin_settings.BRIGHTNESS_DIAL_FIX_ENABLED_KEY: True,
            self.plugin_settings.TRACKPAD_MODE_KEY: "disabled",
        }

        self.assertTrue(self.plugin_settings.migrate_startup_apply_setting())
        persisted = self.plugin_settings.setting_file.persisted_settings
        self.assertNotIn(self.plugin_settings.STARTUP_APPLY_KEY, persisted)
        self.assertTrue(persisted[self.plugin_settings.HOME_BUTTON_ENABLED_KEY])
        self.assertTrue(
            persisted[self.plugin_settings.BRIGHTNESS_DIAL_FIX_ENABLED_KEY]
        )
        self.assertEqual(
            persisted[self.plugin_settings.TRACKPAD_MODE_KEY],
            "disabled",
        )
        self.assertFalse(self.plugin_settings.migrate_startup_apply_setting())


if __name__ == "__main__":
    unittest.main()
