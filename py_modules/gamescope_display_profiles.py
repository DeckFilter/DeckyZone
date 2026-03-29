from pathlib import Path


DEFAULT_SYSTEM_PROFILE_PATHS = (
    Path("/usr/share/gamescope/scripts/00-gamescope/displays/zotac.zone.oled.lua"),
    Path("/etc/gamescope/scripts/00-gamescope/displays/zotac.zone.oled.lua"),
)
ZOTAC_PROFILE_KEY = "gamescope.config.known_displays.zotac_amoled"
ZOTAC_PROFILE_IDENTIFIERS = ("DXQ7D0023", "ZDZ0501")


class GamescopeDisplayProfiles:
    def __init__(self, user_home, plugin_dir, system_profile_paths=None):
        self.user_home = Path(user_home)
        self.plugin_dir = Path(plugin_dir)
        self.system_profile_paths = tuple(
            Path(path)
            for path in (system_profile_paths or DEFAULT_SYSTEM_PROFILE_PATHS)
        )

    @property
    def assets_dir(self):
        return self.plugin_dir / "assets" / "gamescope"

    @property
    def managed_scripts_dir(self):
        return self.user_home / ".config" / "gamescope" / "scripts" / "90-deckyzone" / "displays"

    @property
    def managed_base_profile_path(self):
        return self.managed_scripts_dir / "10-zotac-zone-oled.lua"

    @property
    def managed_green_tint_profile_path(self):
        return self.managed_scripts_dir / "20-zotac-zone-green-tint.lua"

    def _read_file(self, path):
        return Path(path).read_text(encoding="utf-8")

    def _read_asset(self, filename):
        return self._read_file(self.assets_dir / filename)

    def _is_valid_zotac_profile(self, text):
        return ZOTAC_PROFILE_KEY in text and any(
            identifier in text for identifier in ZOTAC_PROFILE_IDENTIFIERS
        )

    def _resolve_builtin_profile_path(self):
        for path in self.system_profile_paths:
            if not path.is_file():
                continue

            try:
                text = self._read_file(path)
            except OSError:
                continue

            if self._is_valid_zotac_profile(text):
                return path

        return None

    def is_builtin_profile_available(self):
        return self._resolve_builtin_profile_path() is not None

    def is_managed_base_profile_installed(self):
        return self.managed_base_profile_path.is_file()

    def is_green_tint_fix_enabled(self):
        return self.managed_green_tint_profile_path.is_file()

    def is_base_profile_available(self):
        return self.is_builtin_profile_available() or self.is_managed_base_profile_installed()

    def get_state(self):
        return {
            "gamescopeZotacProfileBuiltIn": self.is_builtin_profile_available(),
            "gamescopeZotacProfileInstalled": self.is_managed_base_profile_installed(),
            "gamescopeGreenTintFixEnabled": self.is_green_tint_fix_enabled(),
        }

    def _write_managed_profile(self, path, contents):
        self.managed_scripts_dir.mkdir(parents=True, exist_ok=True)
        path.write_text(contents, encoding="utf-8")

    def _remove_managed_profile(self, path):
        if path.exists():
            path.unlink()

    def _cleanup_empty_directories(self):
        for path in (self.managed_scripts_dir, self.managed_scripts_dir.parent):
            if not path.exists():
                continue
            try:
                path.rmdir()
            except OSError:
                pass

    def set_zotac_profile_enabled(self, enabled):
        if enabled:
            self._write_managed_profile(
                self.managed_base_profile_path,
                self._read_asset("zotac.zone.oled.lua"),
            )
            return self.get_state()

        self._remove_managed_profile(self.managed_base_profile_path)
        if not self.is_builtin_profile_available():
            self._remove_managed_profile(self.managed_green_tint_profile_path)
        self._cleanup_empty_directories()
        return self.get_state()

    def set_green_tint_fix_enabled(self, enabled):
        if enabled:
            if not self.is_base_profile_available():
                return self.get_state()

            self._write_managed_profile(
                self.managed_green_tint_profile_path,
                self._read_asset("zotac.zone.green-tint.lua"),
            )
            return self.get_state()

        self._remove_managed_profile(self.managed_green_tint_profile_path)
        self._cleanup_empty_directories()
        return self.get_state()

    def cleanup_managed_files(self):
        self._remove_managed_profile(self.managed_green_tint_profile_path)
        self._remove_managed_profile(self.managed_base_profile_path)
        self._cleanup_empty_directories()
        return self.get_state()
