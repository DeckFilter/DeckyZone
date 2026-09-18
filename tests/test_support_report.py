import logging
import sys
import tempfile
import unittest
from pathlib import Path


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


if __name__ == "__main__":
    unittest.main()
