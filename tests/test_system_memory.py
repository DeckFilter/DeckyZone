import sys
import tempfile
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "py_modules"))

import system_memory


class SystemMemoryTests(unittest.TestCase):
    def test_parses_memtotal_as_binary_gib(self):
        meminfo = "MemTotal:       12345678 kB\nMemFree:         1024 kB\n"

        self.assertEqual(system_memory.parse_memtotal_gb(meminfo), 11.77)

    def test_accepts_whitespace_and_memtotal_in_any_order(self):
        meminfo = (
            "MemFree: 1024 kB\n"
            "  SwapTotal:\t2097152 kB\n"
            "\tMemTotal :   16777216   kB  \n"
            "MemAvailable: 8388608 kB\n"
        )

        self.assertEqual(system_memory.parse_memtotal_gb(meminfo), 16.0)

    def test_returns_none_when_memtotal_is_missing(self):
        self.assertIsNone(
            system_memory.parse_memtotal_gb(
                "MemFree: 1024 kB\nMemAvailable: 2048 kB\n"
            )
        )

    def test_returns_none_for_malformed_memtotal(self):
        malformed_values = (
            "MemTotal: unknown kB\n",
            "MemTotal: 16777216 MB\n",
            "MemTotal: 16777216\n",
        )

        for meminfo in malformed_values:
            with self.subTest(meminfo=meminfo):
                self.assertIsNone(system_memory.parse_memtotal_gb(meminfo))

    def test_returns_none_for_nonpositive_memtotal(self):
        for total_kib in (0, -1):
            with self.subTest(total_kib=total_kib):
                self.assertIsNone(
                    system_memory.parse_memtotal_gb(
                        f"MemTotal: {total_kib} kB\n"
                    )
                )

    def test_prefers_twelve_gib_from_online_sysfs_memory_blocks(self):
        with tempfile.TemporaryDirectory() as directory:
            memory_path = Path(directory) / "memory"
            memory_path.mkdir()
            (memory_path / "block_size_bytes").write_text(
                "0x40000000\n",
                encoding="utf-8",
            )
            for index in range(12):
                block_path = memory_path / f"memory{index}"
                block_path.mkdir()
                (block_path / "online").write_text("1\n", encoding="utf-8")

            result = system_memory.read_system_ram_gb(
                meminfo_path=Path(directory) / "missing-meminfo",
                memory_sysfs_path=memory_path,
            )

        self.assertEqual(result, 12.0)

    def test_excludes_offline_blocks_and_counts_missing_online_as_online(self):
        with tempfile.TemporaryDirectory() as directory:
            memory_path = Path(directory) / "memory"
            memory_path.mkdir()
            (memory_path / "block_size_bytes").write_text(
                "1073741824\n",
                encoding="utf-8",
            )
            for index, online in enumerate((None, "0", "1")):
                block_path = memory_path / f"memory{index}"
                block_path.mkdir()
                if online is not None:
                    (block_path / "online").write_text(
                        f"{online}\n",
                        encoding="utf-8",
                    )

            result = system_memory.read_system_ram_gb(
                meminfo_path=Path(directory) / "missing-meminfo",
                memory_sysfs_path=memory_path,
            )

        self.assertEqual(result, 2.0)

    def test_falls_back_to_memtotal_when_sysfs_is_invalid(self):
        with tempfile.TemporaryDirectory() as directory:
            memory_path = Path(directory) / "memory"
            memory_path.mkdir()
            (memory_path / "block_size_bytes").write_text(
                "not-a-size\n",
                encoding="utf-8",
            )
            (memory_path / "memory0").mkdir()
            meminfo_path = Path(directory) / "meminfo"
            meminfo_path.write_text("MemTotal: 8388608 kB\n", encoding="utf-8")

            result = system_memory.read_system_ram_gb(
                meminfo_path=meminfo_path,
                memory_sysfs_path=memory_path,
            )

        self.assertEqual(result, 8.0)

    def test_falls_back_to_memtotal_when_sysfs_cannot_be_read(self):
        with tempfile.TemporaryDirectory() as directory:
            meminfo_path = Path(directory) / "meminfo"
            meminfo_path.write_text("MemTotal: 6291456 kB\n", encoding="utf-8")

            result = system_memory.read_system_ram_gb(
                meminfo_path=meminfo_path,
                memory_sysfs_path=Path(directory) / "missing-memory-sysfs",
            )

        self.assertEqual(result, 6.0)

    def test_returns_none_when_sysfs_and_meminfo_cannot_be_read(self):
        with tempfile.TemporaryDirectory() as directory:
            missing_meminfo_path = Path(directory) / "missing-meminfo"
            missing_memory_path = Path(directory) / "missing-memory-sysfs"

            result = system_memory.read_system_ram_gb(
                meminfo_path=missing_meminfo_path,
                memory_sysfs_path=missing_memory_path,
            )

        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
