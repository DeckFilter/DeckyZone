"""ZONE command packets; matches the existing trackpad mapping protocol."""

import os
import select
import time
from pathlib import Path


def devices():
    result = {}
    for path in Path("/sys/class/hidraw").glob("hidraw*/device"):
        attrs = {}
        real = path.resolve()
        for parent in (real, *real.parents):
            for name in ("idVendor", "idProduct", "bInterfaceNumber"):
                p = parent / name
                if name not in attrs and p.is_file():
                    attrs[name] = p.read_text().strip().lower()
        if (
            attrs.get("idVendor") in ("1ee9", "1e19")
            and attrs.get("idProduct") == "1590"
        ):
            result[attrs.get("bInterfaceNumber")] = "/dev/" + path.parent.name
    if "01" not in result or "03" not in result:
        raise RuntimeError("ZONE controller interfaces are unavailable.")
    return result


def event_path(name):
    for p in Path("/sys/class/input").glob("event*/device/name"):
        if p.read_text().strip() == name:
            return "/dev/input/" + p.parts[-3]
    raise RuntimeError(f"{name} is unavailable.")


class CommandDevice:
    def __init__(self, path):
        self.path = path
        self.sequence = 0

    def exchange(self, command, payload):
        packet = bytearray(64)
        self.sequence = (self.sequence + 1) & 255
        packet[:5] = bytes((0xE1, 0, self.sequence, 0x3C, command))
        packet[5 : 5 + len(payload)] = payload
        crc = 0
        for value in packet[4:62]:
            h1 = (crc ^ value) & 255
            h2 = h1 & 15
            h3 = (h2 << 4) ^ h1
            h4 = h3 >> 4
            crc = (((((h3 << 1) ^ h4) << 4) ^ h2) << 3) ^ h4 ^ (crc >> 8)
            crc &= 0xFFFF
        packet[62:64] = crc.to_bytes(2, "big")
        fd = os.open(self.path, os.O_RDWR | os.O_NONBLOCK)
        try:
            os.write(fd, b"\0" + packet)
            deadline = time.monotonic() + 1
            while time.monotonic() < deadline:
                if not select.select([fd], [], [], max(0, deadline - time.monotonic()))[
                    0
                ]:
                    break
                reply = os.read(fd, 65)
                if len(reply) == 65 and reply[0] == 0:
                    reply = reply[1:]
                if (
                    len(reply) == 64
                    and reply[0] == 0xE1
                    and reply[2] == self.sequence
                    and reply[4] == command
                ):
                    return reply
            raise RuntimeError("ZONE controller command timed out.")
        finally:
            os.close(fd)

    def read(self, button):
        payload = self.exchange(0xA2, bytes([button]))[5:19]
        if len(payload) != 14 or payload[0] != button:
            raise RuntimeError("Invalid ZONE mapping reply.")
        return payload

    def write(self, payload):
        if len(payload) != 14 or payload[0] not in range(3, 11):
            raise ValueError("Invalid ZONE trackpad mapping.")
        if self.exchange(0xA1, payload)[6] != 0 or self.read(payload[0]) != payload:
            raise RuntimeError("ZONE trackpad mapping was not applied.")
