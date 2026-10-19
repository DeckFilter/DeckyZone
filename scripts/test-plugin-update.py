#!/usr/bin/env python3
"""Focused release-selection and installation safety checks; no network/device writes."""

from copy import deepcopy
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import types
import unittest
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "py_modules"))
sys.modules.setdefault("decky", types.SimpleNamespace(DECKY_USER_HOME="/unused"))
import plugin_update as updater
from release_versions import is_prerelease_version, normalize_version, parse_version, require_version


def release(version="0.7.0", *, release_id=1):
    return {
        "id": release_id, "tag_name": f"v{version}", "name": version,
        "body": "### Fixes\n\n- An update.", "draft": False,
        "prerelease": "-pre." in version, "published_at": "2026-10-19T00:00:00Z",
        "html_url": f"https://github.com/DeckFilter/DeckyZone/releases/tag/v{version}",
        "assets": [{"id": release_id + 100, "name": "DeckyZone.tar.gz", "state": "uploaded",
                    "browser_download_url": f"https://github.com/DeckFilter/DeckyZone/releases/download/v{version}/DeckyZone.tar.gz"}],
    }


def archive(path, version, *, unsafe=False):
    with tarfile.open(path, "w:gz") as output:
        payload = json.dumps({"version": version}).encode()
        info = tarfile.TarInfo("../escape" if unsafe else "DeckyZone/package.json")
        info.size = len(payload)
        output.addfile(info, io.BytesIO(payload))


class VersionTests(unittest.TestCase):
    def test_numeric_counter_and_stable_order(self):
        versions = ["0.7.0-pre.10", "0.7.0", "0.7.0-pre.2", "0.6.9", "0.8.0-pre.1"]
        self.assertEqual(sorted(versions, key=require_version),
                         ["0.6.9", "0.7.0-pre.2", "0.7.0-pre.10", "0.7.0", "0.8.0-pre.1"])
        self.assertTrue(is_prerelease_version("v0.7.0-pre.1", allow_tag=True))
        self.assertEqual(normalize_version("v0.7.0", allow_tag=True), "0.7.0")

    def test_unsupported_and_noncanonical_versions(self):
        for value in (None, True, "v0.7.0", "0.7", "01.7.0", "0.7.0-pre.0", "0.7.0-pre.01",
                      "0.7.0-beta.1", "0.7.0+build", " 0.7.0", "0.7.0\n"):
            with self.subTest(value=value):
                self.assertIsNone(parse_version(value))


class ReleaseTests(unittest.TestCase):
    def test_channel_selection_and_flag_consistency(self):
        releases = [release("0.7.0-pre.2"), release("0.7.0-pre.10", release_id=2),
                    release("0.6.9", release_id=3), release("0.7.0", release_id=4)]
        draft = release("9.0.0", release_id=5)
        draft["draft"] = True
        mismatch = release("8.0.0", release_id=6)
        mismatch["prerelease"] = True
        unsupported = release("7.0.0-beta.1", release_id=7)
        with patch.object(updater, "_fetch_releases", return_value=releases + [draft, mismatch, unsupported]):
            self.assertEqual(updater.get_update_release("stable")["id"], 4)
            self.assertEqual(updater.get_update_release("prerelease")["id"], 4)
        with patch.object(updater, "_fetch_releases", return_value=releases[:3]):
            self.assertEqual(updater.get_update_release("prerelease")["id"], 2)
            self.assertEqual(updater.get_update_release("stable")["id"], 3)
            self.assertEqual([note["id"] for note in updater.get_release_notes("stable")], [3])

    def test_missing_newest_asset_fails_without_older_fallback(self):
        newest = release("0.7.0", release_id=2)
        newest["assets"] = []
        with patch.object(updater, "_fetch_releases", return_value=[release("0.6.9"), newest]):
            with self.assertRaisesRegex(RuntimeError, "tarball is unavailable"):
                updater.get_update_release("stable")

    def test_catalogue_reads_every_page(self):
        first = [release("0.6.9", release_id=index + 1) for index in range(100)]
        last = [release("0.7.0", release_id=101)]
        with patch.object(updater, "_fetch_json", side_effect=[first, last]) as fetch:
            self.assertEqual(updater.get_update_release("stable")["id"], 101)
            self.assertEqual(fetch.call_args_list[1].args[0], updater.RELEASE_API_URL + "?per_page=100&page=2")

    def test_changed_release_or_asset_is_rejected(self):
        original = release()
        target = updater._release_target(original)
        for change in ({"draft": True}, {"tag_name": "v0.8.0"}, {"prerelease": True},
                       {"assets": [dict(original["assets"][0], id=999)]}):
            changed = dict(deepcopy(original), **change)
            with self.subTest(change=change), patch.object(updater, "_fetch_json", return_value=changed):
                with self.assertRaisesRegex(RuntimeError, "changed"):
                    updater._verify_selected_release("stable", target)
        with patch.object(updater, "_fetch_json", return_value=original) as fetch:
            self.assertEqual(updater._verify_selected_release("stable", target)["id"], 101)
            fetch.assert_called_once_with(updater.RELEASE_API_URL + "/1")

    def test_invalid_or_empty_channel(self):
        with self.assertRaises(ValueError):
            updater.validate_channel("beta")
        with patch.object(updater, "_fetch_releases", return_value=[]):
            self.assertIsNone(updater.get_update_release("stable"))


class InstallTests(unittest.TestCase):
    def test_mismatched_package_and_unsafe_archive_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "build.tar.gz"
            stage = Path(directory) / "stage"
            stage.mkdir()
            archive(path, "0.6.9")
            with self.assertRaisesRegex(RuntimeError, "version does not match"):
                updater._stage_build(path, stage, "0.7.0")
            archive(path, "0.7.0", unsafe=True)
            with self.assertRaisesRegex(RuntimeError, "invalid entry"):
                updater._stage_build(path, stage, "0.7.0")
            self.assertFalse((Path(directory) / "escape").exists())

    def test_channel_changed_before_fetch_or_replacement(self):
        metadata = release()
        target = updater._release_target(metadata)
        with patch.object(updater, "_fetch_json") as fetch:
            with self.assertRaisesRegex(RuntimeError, "channel changed"):
                updater.ota_update("stable", target, get_saved_channel=lambda: "prerelease")
            fetch.assert_not_called()
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "build.tar.gz"
            archive(path, "0.7.0")
            channels = iter(["stable", "prerelease"])
            with patch.object(updater, "_fetch_json", return_value=metadata), \
                    patch.object(updater, "_download_build", return_value=str(path)), \
                    patch.object(updater.shutil, "copytree") as copy:
                with self.assertRaisesRegex(RuntimeError, "channel changed"):
                    updater.ota_update("stable", target, get_saved_channel=lambda: next(channels))
                copy.assert_not_called()
            self.assertFalse(path.exists())

    def test_exact_selected_build_installs_and_preserves_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            plugin = home / "homebrew/plugins/DeckyZone"
            plugin.mkdir(parents=True)
            (plugin / "package.json").write_text('{"version":"0.6.9"}')
            settings = home / "homebrew/settings/DeckyZone/settings.json"
            settings.parent.mkdir(parents=True)
            settings.write_text('{"rumbleIntensity":75,"updateChannel":"prerelease"}')
            before = settings.read_bytes()
            metadata = release("0.7.0-pre.2")
            path = home / "build.tar.gz"
            archive(path, "0.7.0-pre.2")
            with patch.object(updater.decky, "DECKY_USER_HOME", directory), \
                    patch.object(updater, "_fetch_json", return_value=metadata), \
                    patch.object(updater, "_download_build", return_value=str(path)), \
                    patch.object(updater.subprocess, "run") as restart:
                self.assertTrue(updater.ota_update("prerelease", updater._release_target(metadata),
                                                  get_saved_channel=lambda: "prerelease"))
                self.assertEqual(restart.call_args.args[0], ["systemctl", "restart", "plugin_loader.service"])
            self.assertEqual(json.loads((plugin / "package.json").read_text())["version"], "0.7.0-pre.2")
            self.assertEqual(settings.read_bytes(), before)
            self.assertFalse(path.exists())

    def test_copy_failure_restores_previous_install(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            plugin = home / "homebrew/plugins/DeckyZone"
            plugin.mkdir(parents=True)
            (plugin / "original").write_text("preserved")
            path = home / "build.tar.gz"
            archive(path, "0.7.0")
            metadata = release()
            with patch.object(updater.decky, "DECKY_USER_HOME", directory), \
                    patch.object(updater, "_fetch_json", return_value=metadata), \
                    patch.object(updater, "_download_build", return_value=str(path)), \
                    patch.object(updater.shutil, "copytree", side_effect=OSError("copy failed")), \
                    patch.object(updater.subprocess, "run") as restart:
                with self.assertRaisesRegex(OSError, "copy failed"):
                    updater.ota_update("stable", updater._release_target(metadata), get_saved_channel=lambda: "stable")
                restart.assert_not_called()
            self.assertEqual((plugin / "original").read_text(), "preserved")


if __name__ == "__main__":
    unittest.main()
