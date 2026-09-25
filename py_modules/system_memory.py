"""Read the Linux system-RAM allocation from sysfs or ``/proc/meminfo``."""

from pathlib import Path

MEMINFO_PATH = "/proc/meminfo"
MEMORY_SYSFS_PATH = "/sys/devices/system/memory"
KIB_PER_GIB = 1024 ** 2
BYTES_PER_GIB = 1024 ** 3


def _is_positive_power_of_two(value):
    return value > 0 and value & (value - 1) == 0


def _parse_block_size_bytes(raw_value):
    """Parse a sysfs memory-block size written as hexadecimal or decimal."""
    value = str(raw_value or "").strip().lower()
    if not value:
        return None

    try:
        if value.startswith("0x") or any(char in "abcdef" for char in value):
            candidates = (int(value, 16),)
        else:
            # Linux normally emits this sysfs value as unprefixed hexadecimal,
            # while test and compatibility sources may expose decimal. A real
            # memory block size is a power of two, which disambiguates both.
            candidates = (int(value, 10), int(value, 16))
    except ValueError:
        return None

    for candidate in candidates:
        if _is_positive_power_of_two(candidate):
            return candidate
    return None


def _read_online_memory_gb(memory_sysfs_path):
    """Return the total size of online Linux memory blocks, if available."""
    memory_directory = Path(memory_sysfs_path)
    try:
        block_size_text = (memory_directory / "block_size_bytes").read_text(
            encoding="utf-8"
        )
        memory_blocks = sorted(
            path
            for path in memory_directory.glob("memory[0-9]*")
            if path.name.removeprefix("memory").isdigit() and path.is_dir()
        )
    except (OSError, UnicodeError):
        return None

    block_size_bytes = _parse_block_size_bytes(block_size_text)
    if block_size_bytes is None or not memory_blocks:
        return None

    online_blocks = 0
    for memory_block in memory_blocks:
        try:
            online = (memory_block / "online").read_text(encoding="utf-8").strip()
        except FileNotFoundError:
            # memory0 commonly cannot be offlined and has no online attribute.
            online_blocks += 1
            continue
        except (OSError, UnicodeError):
            return None

        if online == "1":
            online_blocks += 1
        elif online != "0":
            return None

    total_bytes = online_blocks * block_size_bytes
    if total_bytes <= 0:
        return None
    return round(total_bytes / BYTES_PER_GIB, 2)


def parse_memtotal_gb(meminfo_text):
    """Return ``MemTotal`` in binary GiB, rounded to two decimals.

    ``MemTotal`` is the amount of RAM Linux can use after firmware and kernel
    reservations. ``None`` is returned when the field is absent or invalid.
    """
    if not isinstance(meminfo_text, str):
        return None

    for line in meminfo_text.splitlines():
        key, separator, value = line.partition(":")
        if key.strip() != "MemTotal":
            continue
        if not separator:
            return None

        parts = value.split()
        if len(parts) != 2 or parts[1] != "kB":
            return None

        try:
            total_kib = int(parts[0])
        except ValueError:
            return None

        if total_kib <= 0:
            return None

        return round(total_kib / KIB_PER_GIB, 2)

    return None


def read_system_ram_gb(
    meminfo_path=MEMINFO_PATH,
    memory_sysfs_path=MEMORY_SYSFS_PATH,
):
    """Read the Linux system-RAM allocation in binary GiB.

    Online sysfs memory blocks are preferred because they expose the physical
    system-memory allocation without subtracting kernel reservations.
    ``MemTotal`` is the fallback when the sysfs total cannot be determined.
    Both paths are injectable for tests and compatibility environments.
    """
    online_memory_gb = _read_online_memory_gb(memory_sysfs_path)
    if online_memory_gb is not None:
        return online_memory_gb

    try:
        with open(meminfo_path, "r", encoding="utf-8") as handle:
            meminfo_text = handle.read()
    except (OSError, UnicodeError):
        return None

    return parse_memtotal_gb(meminfo_text)
