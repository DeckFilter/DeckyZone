"""Read firmware versions exposed through verified Linux interfaces."""

import ctypes
import fcntl
import glob
import os
from pathlib import Path


EC_FIRMWARE_RELEASE_PATH = "/sys/class/dmi/id/ec_firmware_release"
I2C_ADAPTER_NAME_GLOB = "/sys/class/i2c-dev/i2c-*/name"
DISPLAY_ADAPTER_NAME_PREFIX = "SMBus PIIX4 adapter port 0"
DISPLAY_I2C_ADDRESS = 0x43
DISPLAY_VERSION_PAGE = 0xE0
DISPLAY_VERSION_REGISTERS = (0x81, 0x82, 0x83)
I2C_SLAVE = 0x0703
I2C_SMBUS = 0x0720
I2C_SMBUS_READ = 1
I2C_SMBUS_WRITE = 0
I2C_SMBUS_BYTE_DATA = 2
UNAVAILABLE_DMI_VERSIONS = {
    "0.0",
    "255.255",
    "not specified",
    "unknown",
}


class _I2cSmbusData(ctypes.Union):
    _fields_ = [
        ("byte", ctypes.c_uint8),
        ("word", ctypes.c_uint16),
        ("block", ctypes.c_uint8 * 34),
    ]


class _I2cSmbusIoctlData(ctypes.Structure):
    _fields_ = [
        ("read_write", ctypes.c_uint8),
        ("command", ctypes.c_uint8),
        ("size", ctypes.c_uint32),
        ("data", ctypes.POINTER(_I2cSmbusData)),
    ]


def _normalize_version(value):
    version = str(value or "").strip()
    if not version or version.lower() in UNAVAILABLE_DMI_VERSIONS:
        return None
    return version


def read_ec_firmware_version(
    read_text,
    path=EC_FIRMWARE_RELEASE_PATH,
):
    """Return the EC release reported by SMBIOS, or ``None`` if unavailable."""
    try:
        return _normalize_version(read_text(path))
    except (OSError, UnicodeError):
        return None


def _find_display_i2c_device(read_text, glob_paths=None):
    glob_paths = glob_paths or glob.glob
    for name_path in sorted(glob_paths(I2C_ADAPTER_NAME_GLOB)):
        try:
            adapter_name = str(read_text(name_path) or "").strip()
        except (OSError, UnicodeError):
            continue

        if adapter_name.startswith(DISPLAY_ADAPTER_NAME_PREFIX):
            return f"/dev/{Path(name_path).parent.name}"

    return None


def _smbus_access(fd, read_write, command, data, ioctl=fcntl.ioctl):
    request = _I2cSmbusIoctlData(
        read_write,
        command,
        I2C_SMBUS_BYTE_DATA,
        ctypes.pointer(data),
    )
    ioctl(fd, I2C_SMBUS, request)


def _smbus_write_byte_data(fd, command, value, ioctl=fcntl.ioctl):
    data = _I2cSmbusData()
    data.byte = value
    _smbus_access(fd, I2C_SMBUS_WRITE, command, data, ioctl=ioctl)


def _smbus_read_byte_data(fd, command, ioctl=fcntl.ioctl):
    data = _I2cSmbusData()
    _smbus_access(fd, I2C_SMBUS_READ, command, data, ioctl=ioctl)
    return int(data.byte)


def _read_display_firmware_bytes(
    device_path,
    open_device=os.open,
    close_device=os.close,
    ioctl=fcntl.ioctl,
):
    """Read the LT7911 version using the vendor updater's volatile page select."""
    fd = open_device(device_path, os.O_RDWR | os.O_CLOEXEC)
    try:
        ioctl(fd, I2C_SLAVE, DISPLAY_I2C_ADDRESS)
        _smbus_write_byte_data(fd, 0xFF, DISPLAY_VERSION_PAGE, ioctl=ioctl)
        return tuple(
            _smbus_read_byte_data(fd, register, ioctl=ioctl)
            for register in DISPLAY_VERSION_REGISTERS
        )
    finally:
        close_device(fd)


def _format_display_firmware_version(version_bytes):
    try:
        cid, pid, build = tuple(int(value) for value in version_bytes)
    except (TypeError, ValueError):
        return None

    if any(value < 0 or value > 0xFF for value in (cid, pid, build)):
        return None
    if (cid, pid, build) in ((0, 0, 0), (0xFF, 0xFF, 0xFF)):
        return None

    return f"C{cid:02d} P{pid:02d} T{build:03d}"


def read_display_firmware_version(
    read_text,
    find_device=_find_display_i2c_device,
    read_version_bytes=_read_display_firmware_bytes,
):
    """Return the live LT7911 firmware version, or ``None`` if unavailable."""
    device_path = find_device(read_text)
    if not device_path:
        return None

    try:
        version_bytes = read_version_bytes(device_path)
    except (OSError, TypeError, ValueError):
        return None

    return _format_display_firmware_version(version_bytes)


def read_firmware_versions(
    read_text,
    *,
    supported_device,
    read_display_version=None,
):
    """Return firmware versions that have verified runtime read paths.

    The display read follows Zotac's version command: select the LT7911's
    volatile version page and read its CID, PID, and T-build registers. It does
    not enter update mode or write flash.
    """
    display_reader = read_display_version or read_display_firmware_version
    return {
        "ecVersion": read_ec_firmware_version(read_text),
        "displayVersion": display_reader(read_text) if supported_device else None,
    }
