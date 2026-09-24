import sys
import unittest
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "py_modules"))

import firmware_info


class FirmwareInfoTests(unittest.TestCase):
    def test_reads_ec_firmware_release_from_dmi(self):
        self.assertEqual(
            firmware_info.read_ec_firmware_version(lambda _path: " 1.5\n"),
            "1.5",
        )

    def test_rejects_unavailable_dmi_versions(self):
        for value in ("", "0.0", "255.255", "Unknown", "Not Specified"):
            with self.subTest(value=value):
                self.assertIsNone(
                    firmware_info.read_ec_firmware_version(
                        lambda _path, result=value: result
                    )
                )

    def test_returns_none_when_ec_firmware_release_cannot_be_read(self):
        def missing(_path):
            raise FileNotFoundError

        self.assertIsNone(firmware_info.read_ec_firmware_version(missing))

    def test_finds_display_smbus_adapter_port_zero(self):
        names = {
            "/sys/class/i2c-dev/i2c-4/name": "SMBus PIIX4 adapter port 2 at 0b00\n",
            "/sys/class/i2c-dev/i2c-3/name": "SMBus PIIX4 adapter port 0 at 0b00\n",
        }

        with patch.object(
            firmware_info.glob,
            "glob",
            return_value=list(reversed(names)),
        ):
            self.assertEqual(
                firmware_info._find_display_i2c_device(names.__getitem__),
                "/dev/i2c-3",
            )

    def test_formats_live_display_firmware_version(self):
        self.assertEqual(
            firmware_info._format_display_firmware_version((5, 1, 205)),
            "C05 P01 T205",
        )

    def test_reads_display_version_with_vendor_register_sequence(self):
        calls = []
        closed = []
        values = {0x81: 5, 0x82: 1, 0x83: 205}

        def fake_ioctl(fd, operation, argument):
            if operation == firmware_info.I2C_SLAVE:
                calls.append(("address", fd, argument))
                return

            request = argument
            if request.read_write == firmware_info.I2C_SMBUS_WRITE:
                calls.append(("write", request.command, request.data.contents.byte))
            else:
                calls.append(("read", request.command))
                request.data.contents.byte = values[request.command]

        result = firmware_info._read_display_firmware_bytes(
            "/dev/i2c-3",
            open_device=lambda path, flags: 17,
            close_device=closed.append,
            ioctl=fake_ioctl,
        )

        self.assertEqual(result, (5, 1, 205))
        self.assertEqual(
            calls,
            [
                ("address", 17, 0x43),
                ("write", 0xFF, 0xE0),
                ("read", 0x81),
                ("read", 0x82),
                ("read", 0x83),
            ],
        )
        self.assertEqual(closed, [17])

    def test_rejects_invalid_display_firmware_versions(self):
        for value in ((0, 0, 0), (255, 255, 255), (5, 1), (5, 1, 256)):
            with self.subTest(value=value):
                self.assertIsNone(
                    firmware_info._format_display_firmware_version(value)
                )

    def test_returns_none_when_display_firmware_cannot_be_read(self):
        def missing(_path):
            raise OSError

        self.assertIsNone(
            firmware_info.read_display_firmware_version(
                lambda _path: "adapter",
                find_device=lambda _read_text: "/dev/i2c-3",
                read_version_bytes=missing,
            )
        )

    def test_returns_both_live_firmware_versions(self):
        versions = firmware_info.read_firmware_versions(
            lambda _path: "1.5",
            read_display_version=lambda _read_text: "C05 P01 T205",
        )

        self.assertEqual(versions["ecVersion"], "1.5")
        self.assertEqual(versions["displayVersion"], "C05 P01 T205")


if __name__ == "__main__":
    unittest.main()
