"""Decky identity shared by setup commands and the installed system provider."""

from dataclasses import dataclass
import json
import os
from pathlib import Path
import pwd
import stat

from .sysfs import Unavailable


CONTEXT = Path("/etc/deckyzone/performance-context.json")


@dataclass(frozen=True)
class DeckyContext:
    user: str
    homebrew: Path

    @classmethod
    def parse(cls, data):
        if (not isinstance(data, dict) or set(data) != {"user", "homebrew"}
                or not isinstance(data["user"], str) or not data["user"]
                or any(character in data["user"] for character in "\0\r\n")
                or not isinstance(data["homebrew"], str)):
            raise Unavailable("Invalid Decky user or installation path")
        homebrew = Path(data["homebrew"])
        if (not homebrew.is_absolute() or ".." in homebrew.parts
                or any(character in str(homebrew) for character in "\0\r\n")):
            raise Unavailable("Decky installation path must be absolute")
        return cls(data["user"], homebrew)

    def serialize(self):
        return json.dumps({"user": self.user, "homebrew": str(self.homebrew)}) + "\n"

    def path(self, root=Path("/")):
        return root / self.homebrew.relative_to("/")

    def account(self):
        try:
            account = pwd.getpwnam(self.user)
        except KeyError as error:
            raise Unavailable(f"Decky's session user does not exist: {self.user}") from error
        if account.pw_uid == 0:
            raise Unavailable("Decky's session user must not be root")
        return account


def installed_context(root=Path("/")):
    path = root / CONTEXT.relative_to("/")
    flags = os.O_RDONLY | os.O_CLOEXEC | os.O_NOFOLLOW | os.O_NONBLOCK
    with os.fdopen(os.open(path, flags), "r", encoding="utf-8") as handle:
        info = os.fstat(handle.fileno())
        if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise Unavailable("Decky bridge context must be a root-owned configuration file")
        text = handle.read(4097)
    if len(text) > 4096:
        raise Unavailable("Decky bridge context is too large")
    return DeckyContext.parse(json.loads(text))


def decky_context(root=Path("/")):
    user, homebrew = os.environ.get("DECKYZONE_USER"), os.environ.get("DECKYZONE_HOME")
    if user is not None or homebrew is not None:
        return DeckyContext.parse({"user": user, "homebrew": homebrew})
    try:
        return installed_context(root)
    except FileNotFoundError:
        try:
            manifest = json.loads((root / "var/lib/deckyzone-performance/manifest.json").read_text())
        except FileNotFoundError:
            manifest = {}
        if not isinstance(manifest, dict):
            raise Unavailable("Invalid bridge installation record")
        if str(CONTEXT) in manifest:
            raise Unavailable("Decky's saved installation path is missing; repair native performance controls")
        # Existing SteamOS installations predate the explicit context file.
        return DeckyContext("deck", Path("/home/deck/homebrew"))
