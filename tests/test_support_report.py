import logging
import os
import stat
import sys
import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "py_modules"))

import support_report


class SupportReportRedactionTests(unittest.TestCase):
    def test_redacts_complete_authorization_and_cookie_values(self):
        source = (
            "Authorization: Basic dXNlcjpwYXNz\n"
            "Cookie: session=abc; csrf=def\n"
            '"authorization": "Bearer secret-token", "safe": true\n'
        )

        redacted = support_report.redact_text(source)

        self.assertNotIn("dXNlcjpwYXNz", redacted)
        self.assertNotIn("session=abc", redacted)
        self.assertNotIn("csrf=def", redacted)
        self.assertNotIn("secret-token", redacted)
        self.assertEqual(redacted.count("<redacted>"), 3)

    def test_redacts_complete_unquoted_credential_values(self):
        source = (
            "password: correct horse battery staple\n"
            "token=first; second=still-secret\n"
            "api_key: abc def\n"
        )

        redacted = support_report.redact_text(source)

        self.assertNotIn("horse battery staple", redacted)
        self.assertNotIn("second=still-secret", redacted)
        self.assertNotIn("abc def", redacted)
        self.assertEqual(redacted.count("<redacted>"), 3)

    def test_redacts_compound_credential_keys(self):
        source = (
            'access_token="access-value"\n'
            'refresh_token: refresh-value\n'
            'client_secret="client-value"\n'
            'accessToken="camel-access"\n'
            'clientSecret: camel-client\n'
            'token_value=suffix-token\n'
            'secret_key=suffix-secret\n'
            'AWS_SECRET_ACCESS_KEY=aws-value\n'
        )

        redacted = support_report.redact_text(source)

        self.assertNotIn("access-value", redacted)
        self.assertNotIn("refresh-value", redacted)
        self.assertNotIn("client-value", redacted)
        self.assertNotIn("camel-access", redacted)
        self.assertNotIn("camel-client", redacted)
        self.assertNotIn("suffix-token", redacted)
        self.assertNotIn("suffix-secret", redacted)
        self.assertNotIn("aws-value", redacted)
        self.assertEqual(redacted.count("<redacted>"), 8)

    def test_redacts_valid_ipv6_addresses(self):
        source = (
            "peer=2001:db8::1 "
            "link=[fe80::1%wlan0] "
            "mapped=::ffff:192.0.2.128 "
            "endpoint=https://[2001:db8::2]:443/path "
            "sentence=2001:db8::3. "
            "mapped_sentence=::ffff:192.0.2.129."
        )

        redacted = support_report.redact_text(source)

        self.assertNotIn("2001:db8::1", redacted)
        self.assertNotIn("fe80::1", redacted)
        self.assertNotIn("::ffff:192.0.2.128", redacted)
        self.assertNotIn("2001:db8::2", redacted)
        self.assertNotIn("2001:db8::3", redacted)
        self.assertNotIn("::ffff:192.0.2.129", redacted)
        self.assertIn("https://<ipv6>:443/path", redacted)
        self.assertIn("sentence=<ipv6>.", redacted)
        self.assertIn("mapped_sentence=<ipv6>.", redacted)
        self.assertEqual(redacted.count("<ipv6>"), 6)

    def test_rejects_symlinked_log_path(self):
        with tempfile.TemporaryDirectory() as directory:
            secret_path = Path(directory) / "secret"
            log_path = Path(directory) / "plugin.log"
            secret_path.write_text("root-only secret\n", encoding="utf-8")
            log_path.symlink_to(secret_path)

            text, included, truncated, error = support_report._read_log_tail(
                log_path,
                logger=logging.getLogger("support-report-test"),
            )

        self.assertEqual(text, "")
        self.assertFalse(included)
        self.assertFalse(truncated)
        self.assertTrue(error)
        self.assertNotIn("root-only secret", error)

    @unittest.skipUnless(hasattr(os, "mkfifo"), "FIFO support is unavailable")
    def test_rejects_non_regular_log_path_without_blocking(self):
        with tempfile.TemporaryDirectory() as directory:
            log_path = Path(directory) / "plugin.log"
            os.mkfifo(log_path)

            text, included, truncated, error = support_report._read_log_tail(
                log_path,
                logger=logging.getLogger("support-report-test"),
            )

        self.assertEqual(text, "")
        self.assertFalse(included)
        self.assertFalse(truncated)
        self.assertIn("not a regular file", error)

    def test_discards_partial_first_log_line(self):
        partial_secret = "Authorization: Basic " + ("s" * support_report.MAX_LOG_TAIL_BYTES)
        complete_line = "safe complete line\n"

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "plugin.log"
            path.write_text(partial_secret + "\n" + complete_line, encoding="utf-8")

            text, included, truncated, error = support_report._read_log_tail(
                path,
                logger=logging.getLogger("support-report-test"),
            )

        self.assertTrue(included)
        self.assertTrue(truncated)
        self.assertIsNone(error)
        self.assertEqual(text, complete_line)
        self.assertNotIn("Authorization", text)

    def test_reports_no_complete_lines_for_one_oversized_line(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "plugin.log"
            path.write_text("token=" + ("s" * support_report.MAX_LOG_TAIL_BYTES), encoding="utf-8")

            text, included, truncated, error = support_report._read_log_tail(
                path,
                logger=logging.getLogger("support-report-test"),
            )

        self.assertEqual(text, "")
        self.assertFalse(included)
        self.assertTrue(truncated)
        self.assertIn("No complete log lines", error)

    def test_generated_report_does_not_add_a_privacy_line(self):
        def missing_text(_path):
            raise FileNotFoundError

        report = support_report.build_support_report(
            plugin_version="0.5.0",
            decky_version="v3.2.9",
            debug_snapshot={},
            supported_device=True,
            remaining_battery_enabled=False,
            logger=logging.getLogger("support-report-test"),
            log_path=None,
            command_runner=lambda *_args, **_kwargs: SimpleNamespace(
                returncode=1,
                stdout="",
                stderr="Unavailable",
            ),
            read_text=missing_text,
            path_exists=lambda _path: False,
            pending_vram_reader=lambda: 4,
            active_vram_reader=lambda: 4,
        )

        self.assertNotIn("Privacy:", report["text"])

    def test_generated_report_uses_divided_sections_without_snapshot_duplication(self):
        def missing_text(_path):
            raise FileNotFoundError

        report = support_report.build_support_report(
            plugin_version="0.5.0",
            decky_version="v3.2.9",
            debug_snapshot={
                "deviceIdentity": {
                    "vendorName": "ZOTAC",
                    "productName": "ZOTAC GAMING ZONE",
                    "boardVendor": "ZOTAC",
                    "boardName": "G0A1W",
                },
                "osContext": {
                    "prettyName": "SteamOS",
                    "kernelRelease": "6.11-test",
                },
                "memory": {
                    "systemRamGb": 12,
                    "activeVramGb": 4,
                },
            },
            supported_device=True,
            remaining_battery_enabled=False,
            logger=logging.getLogger("support-report-test"),
            log_path=None,
            command_runner=lambda *_args, **_kwargs: SimpleNamespace(
                returncode=1,
                stdout="",
                stderr="Unavailable",
            ),
            read_text=missing_text,
            path_exists=lambda _path: False,
            pending_vram_reader=lambda: 4,
            active_vram_reader=lambda: 4,
        )

        text = report["text"]
        self.assertTrue(
            text.startswith(
                f"{support_report.REPORT_DIVIDER}\nSection: Report metadata\n"
            )
        )
        self.assertIn("Section: Device and operating system", text)
        self.assertIn("Section: Input and controller", text)
        self.assertIn("Section: Display", text)
        self.assertIn("Section: VRAM", text)
        self.assertIn("Section: Remaining battery time", text)
        self.assertIn("Section: Recent DeckyZone log", text)
        self.assertIn("System RAM: 12 GB", text)
        self.assertIn("Active VRAM: 4 GB", text)
        self.assertEqual(text.count("Operating system: SteamOS"), 1)
        self.assertEqual(text.count("Kernel: 6.11-test"), 1)
        self.assertNotIn("Existing debug snapshot", text)
        self.assertNotIn("Firmware attributes", text)
        self.assertNotIn("HID config search root", text)
        self.assertNotIn("Built-in candidate paths", text)
        self.assertNotIn("Gyro system path", text)
        self.assertNotIn("Pending probe error: None", text)


class SupportReportSaveTests(unittest.TestCase):
    _NOW = datetime(2026, 9, 18, 12, 34, 56, tzinfo=timezone.utc)

    def _save(self, home, report_text="DeckyZone support report\nvalue=✓"):
        account = SimpleNamespace(
            pw_uid=os.getuid(),
            pw_gid=os.getgid(),
            pw_dir=str(home),
        )
        with patch.object(support_report.pwd, "getpwnam", return_value=account):
            return support_report.save_report_to_desktop(
                report_text,
                user_home=str(home),
                user_name="deck",
                now=self._NOW,
            )

    def test_saves_exact_text_with_private_user_owned_permissions(self):
        report_text = "DeckyZone support report\nUnicode: ✓\n"

        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            desktop = home / "Desktop"
            desktop.mkdir()

            result = self._save(home, report_text)
            report_path = desktop / result["filename"]

            self.assertEqual(report_path.read_text(encoding="utf-8"), report_text)
            self.assertEqual(stat.S_IMODE(report_path.stat().st_mode), 0o600)
            self.assertEqual(report_path.stat().st_uid, os.getuid())
            self.assertEqual(report_path.stat().st_gid, os.getgid())
            self.assertEqual(
                result["displayPath"],
                f"~/Desktop/{result['filename']}",
            )
            self.assertNotIn("path", result)

    def test_creates_missing_desktop_with_user_owned_permissions(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            desktop = home / "Desktop"

            result = self._save(home)
            report_path = desktop / result["filename"]

            self.assertTrue(report_path.is_file())
            self.assertEqual(stat.S_IMODE(desktop.stat().st_mode), 0o755)
            self.assertEqual(desktop.stat().st_uid, os.getuid())
            self.assertEqual(desktop.stat().st_gid, os.getgid())

    def test_uses_collision_safe_filename_without_overwriting(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            desktop = home / "Desktop"
            desktop.mkdir()

            first = self._save(home, "first report")
            second = self._save(home, "second report")

            self.assertNotEqual(first["filename"], second["filename"])
            self.assertTrue(second["filename"].endswith("-2.txt"))
            self.assertEqual(
                (desktop / first["filename"]).read_text(encoding="utf-8"),
                "first report",
            )
            self.assertEqual(
                (desktop / second["filename"]).read_text(encoding="utf-8"),
                "second report",
            )

    def test_uses_localized_xdg_desktop_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            config = home / ".config"
            desktop_parent = home / "Arbeitsbereich"
            desktop = desktop_parent / "Schreibtisch"
            config.mkdir()
            (config / "user-dirs.dirs").write_text(
                'XDG_DESKTOP_DIR="$HOME/Arbeitsbereich/Schreibtisch"\n',
                encoding="utf-8",
            )

            result = self._save(home)

            self.assertTrue((desktop / result["filename"]).is_file())
            for created_directory in (desktop_parent, desktop):
                self.assertEqual(
                    stat.S_IMODE(created_directory.stat().st_mode),
                    0o755,
                )
                self.assertEqual(created_directory.stat().st_uid, os.getuid())
                self.assertEqual(created_directory.stat().st_gid, os.getgid())
            self.assertEqual(
                result["displayPath"],
                f"~/Arbeitsbereich/Schreibtisch/{result['filename']}",
            )

    def test_rejects_xdg_desktop_outside_user_home(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)
            config = home / ".config"
            desktop = home / "Desktop"
            config.mkdir()
            desktop.mkdir()
            (config / "user-dirs.dirs").write_text(
                'XDG_DESKTOP_DIR="/tmp"\n',
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "within the user home"):
                self._save(home)

            self.assertEqual(list(desktop.iterdir()), [])

    def test_rejects_symlinked_desktop_directory(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory) / "home"
            outside = Path(directory) / "outside"
            home.mkdir()
            outside.mkdir()
            (home / "Desktop").symlink_to(outside, target_is_directory=True)

            with self.assertRaisesRegex(ValueError, "symbolic links"):
                self._save(home)

            self.assertEqual(list(outside.iterdir()), [])

    def test_enforces_limit_using_encoded_utf8_size(self):
        oversized_report = "✓" * ((support_report.MAX_REPORT_BYTES // 3) + 1)

        with self.assertRaisesRegex(ValueError, "64 KiB"):
            support_report.save_report_to_desktop(
                oversized_report,
                user_home="/unused",
                user_name="deck",
                now=self._NOW,
            )


if __name__ == "__main__":
    unittest.main()
