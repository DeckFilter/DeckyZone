"""Opt-in InputPlumber releases beside the OS package, with an owned unit drop-in.

Release files deliberately live outside the plugin's settings/runtime directories.
Removing or resetting DeckyZone must not remove a running service's executable.
"""

from contextlib import contextmanager
from dataclasses import dataclass, field
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shlex
import shutil
import ssl
import stat
import subprocess
import tempfile
import threading
import time
import urllib.error
import urllib.parse
import urllib.request


RELEASE_API_URL = "https://api.github.com/repos/ShadowBlip/InputPlumber/releases/latest"
RELEASE_URL_PREFIX = "https://github.com/ShadowBlip/InputPlumber/releases/download/"
ARCHIVE_NAME = "inputplumber-x86_64.tar.gz"
CHECKSUM_NAME = ARCHIVE_NAME + ".sha256.txt"
MAX_ARCHIVE_BYTES = 32 * 1024 * 1024
MAX_UNPACKED_BYTES = 128 * 1024 * 1024
MAX_ARCHIVE_ENTRIES = 2048
NETWORK_TIMEOUT_SECONDS = 15
ACTIVATION_TIMEOUT_SECONDS = 20
_VERSION = r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)"
_MARKER = "# Managed by DeckyZone InputPlumber updater v1\n"
_MANIFEST = ".deckyzone-release.json"
_JOURNAL = ".transaction.json"
_SYSTEMCTL = "/usr/bin/systemctl"
_BUSCTL = "/usr/bin/busctl"
_SERVICE = "inputplumber.service"


class InputPlumberUpdateError(RuntimeError):
    pass


@dataclass(frozen=True)
class InputPlumberChange:
    """An opaque compare-and-restore record; not an RPC response."""

    _owner: object = field(repr=False)
    _before: bytes | None = field(repr=False)
    _after: bytes | None = field(repr=False)


class _ReleaseRedirects(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        parsed = urllib.parse.urlsplit(new_url)
        if (
            parsed.scheme != "https"
            or parsed.hostname not in {
                "github.com", "release-assets.githubusercontent.com",
                "objects.githubusercontent.com",
            }
            or parsed.username is not None
            or parsed.password is not None
            or parsed.port not in (None, 443)
            or parsed.fragment
        ):
            raise InputPlumberUpdateError("The upstream download redirected outside trusted GitHub hosts.")
        return super().redirect_request(request, fp, code, message, headers, new_url)


class InputPlumberUpdater:
    def __init__(self, command_runner=subprocess.run, read_text=None, command_env=None, paths=None):
        self.command_runner = command_runner
        self.read_text = read_text or (lambda path: Path(path).read_text(encoding="utf-8"))
        self.command_env = command_env
        # Overrides exist for disposable local harnesses; frontend callers cannot supply them.
        paths = paths or {}
        allowed = {"state_root", "dropin", "system_binary", "system_data", "os_release",
                   "proc_root", "unit_paths", "security_root", "owner_uid", "owner_gid"}
        if set(paths) - allowed:
            raise ValueError("Unknown InputPlumber updater test path.")
        self.state_root = Path(paths.get("state_root", "/var/lib/deckyzone/inputplumber"))
        self.releases = self.state_root / "releases"
        self.dropin = Path(paths.get("dropin", "/etc/systemd/system/inputplumber.service.d/90-deckyzone-updater.conf"))
        self.system_binary = Path(paths.get("system_binary", "/usr/bin/inputplumber"))
        self.system_data = Path(paths.get("system_data", "/usr/share/inputplumber"))
        self.os_release = Path(paths.get("os_release", "/etc/os-release"))
        self.proc_root = Path(paths.get("proc_root", "/proc"))
        self.unit_paths = tuple(Path(path) for path in paths.get("unit_paths", (
            "/usr/lib/systemd/system/inputplumber.service", "/lib/systemd/system/inputplumber.service")))
        self.security_root = Path(paths.get("security_root", "/"))
        self.owner_uid = paths.get("owner_uid", 0)
        self.owner_gid = paths.get("owner_gid", 0)
        for path in (self.state_root, self.dropin, self.system_binary, self.system_data, self.security_root):
            if not path.is_absolute() or any(character.isspace() for character in str(path)):
                raise ValueError("Updater paths must be absolute and contain no whitespace.")
        self._operation_lock = threading.Lock()
        self._busy = False
        self._record_owner = object()
        self._release = None
        self._checked_at = None
        self._check_error = None
        self._digest_cache = {}
        self._version_cache = {}

    @staticmethod
    def _version_tuple(version):
        if not isinstance(version, str) or not re.fullmatch(_VERSION, version):
            raise InputPlumberUpdateError("InputPlumber requires a stable numeric release version.")
        return tuple(int(part) for part in version.split("."))

    def _supported(self):
        try:
            values = {}
            for line in self.read_text(str(self.os_release)).splitlines():
                if "=" in line and not line.lstrip().startswith("#"):
                    key, value = line.split("=", 1)
                    values[key.strip()] = value.strip().strip("\"'")
            return values.get("ID") == "steamos" and platform.machine() == "x86_64"
        except (OSError, ValueError, TypeError):
            return False

    def _require_supported(self):
        if not self._supported():
            raise InputPlumberUpdateError("Manual InputPlumber updates are available only on SteamOS x86_64.")
        if os.geteuid() != self.owner_uid:
            raise InputPlumberUpdateError("The InputPlumber updater needs the Decky backend's root permissions.")

    def _run(self, arguments, timeout=5, checked=False):
        configured = self.command_env() if callable(self.command_env) else self.command_env
        environment = dict(os.environ if configured is None else configured)
        # Preflight must resolve the same OS libraries as the system service, not Decky's Python libraries.
        environment["LD_LIBRARY_PATH"] = ""
        try:
            result = self.command_runner(arguments, check=False, text=True, stdout=subprocess.PIPE,
                                         stderr=subprocess.PIPE, timeout=timeout, env=environment)
        except (OSError, subprocess.SubprocessError) as error:
            raise InputPlumberUpdateError("InputPlumber service command could not complete.") from error
        if checked and result.returncode != 0:
            raise InputPlumberUpdateError("InputPlumber service command failed: " + Path(arguments[0]).name + ".")
        return result

    def _secure_path(self, path, kind=None, missing=False):
        path = Path(path)
        try:
            path.relative_to(self.security_root)
        except ValueError as error:
            raise InputPlumberUpdateError("Updater path is outside its trusted filesystem root.") from error
        current = self.security_root
        parts = path.relative_to(self.security_root).parts
        for index, part in enumerate((None, *parts)):
            if part is not None:
                current = current / part
            try:
                info = current.lstat()
            except FileNotFoundError:
                if missing:
                    return
                raise InputPlumberUpdateError("A required InputPlumber updater path is absent.")
            if stat.S_ISLNK(info.st_mode) or info.st_uid != self.owner_uid or info.st_mode & 0o022:
                raise InputPlumberUpdateError("InputPlumber updater paths must be root-owned, without symlinks or writable ancestors.")
            final = index == len(parts)
            if not final and not stat.S_ISDIR(info.st_mode):
                raise InputPlumberUpdateError("An InputPlumber updater parent is not a directory.")
            if final and ((kind == "file" and not stat.S_ISREG(info.st_mode)) or
                          (kind == "dir" and not stat.S_ISDIR(info.st_mode))):
                raise InputPlumberUpdateError("An InputPlumber updater path has an unexpected file type.")

    def _ensure_directory(self, path):
        path = Path(path)
        self._secure_path(path, "dir", missing=True)
        if path.exists():
            self._secure_path(path, "dir")
            return
        self._ensure_directory(path.parent)
        path.mkdir(mode=0o755)
        os.chown(path, self.owner_uid, self.owner_gid)
        self._secure_path(path, "dir")

    def _digest(self, path):
        self._secure_path(path, "file")
        info = path.stat()
        key = (str(path), info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
        if key not in self._digest_cache:
            value = hashlib.sha256()
            with path.open("rb") as handle:
                for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                    value.update(chunk)
            self._digest_cache[key] = value.hexdigest()
            if len(self._digest_cache) > 4096:
                self._digest_cache = {key: self._digest_cache[key]}
        return self._digest_cache[key]

    def _binary_version(self, path):
        self._secure_path(path, "file")
        info = path.stat()
        if not info.st_mode & stat.S_IXUSR:
            raise InputPlumberUpdateError("The selected InputPlumber binary is not executable.")
        key = (str(path), info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns, info.st_ctime_ns)
        if key not in self._version_cache:
            result = self._run([str(path), "--version"])
            match = re.fullmatch(r"inputplumber\s+v?(" + _VERSION + r")\s*", result.stdout or "")
            if result.returncode != 0 or match is None:
                raise InputPlumberUpdateError("The staged InputPlumber binary cannot run with the installed OS libraries.")
            self._version_cache[key] = match.group(1)
        return self._version_cache[key]

    def _dropin_bytes(self, version):
        self._version_tuple(version)
        release = self.releases / version
        return (_MARKER + "[Service]\nExecStart=\nExecStart=" + str(release / "usr/bin/inputplumber") +
                "\nWorkingDirectory=/\nEnvironment=\"XDG_DATA_DIRS=" + str(release / "usr/share") + "\"\n").encode()

    def _read_dropin(self):
        self._secure_path(self.dropin, "file", missing=True)
        if not self.dropin.exists():
            return None, None
        if self.dropin.stat().st_size > 4096:
            raise InputPlumberUpdateError("The InputPlumber updater drop-in contains foreign configuration.")
        content = self.dropin.read_bytes()
        return content, self._dropin_version(content)

    def _dropin_version(self, content):
        if content is None:
            return None
        match = re.search(re.escape(str(self.releases)) + r"/(" + _VERSION + r")/usr/bin/inputplumber\n", content.decode("utf-8", "replace"))
        if match is None or content != self._dropin_bytes(match.group(1)):
            raise InputPlumberUpdateError("The InputPlumber updater drop-in contains foreign configuration; it was left unchanged.")
        return match.group(1)

    def _read_pending(self):
        path = self.state_root / _JOURNAL
        self._secure_path(path, "file", missing=True)
        if not path.exists():
            return None
        if path.stat().st_size > 16384:
            raise InputPlumberUpdateError("The InputPlumber recovery journal contains foreign data.")
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            if not isinstance(data, dict) or set(data) != {"owner", "previous", "target"}:
                raise ValueError()
            if data["owner"] != "DeckyZone InputPlumber updater v1":
                raise ValueError()
            values = []
            for name in ("previous", "target"):
                value = data[name]
                if value is not None and not isinstance(value, str):
                    raise ValueError()
                content = value.encode("utf-8") if value is not None else None
                self._dropin_version(content)
                values.append(content)
            if values[0] == values[1]:
                raise ValueError()
        except (ValueError, TypeError, UnicodeError) as error:
            raise InputPlumberUpdateError("The InputPlumber recovery journal contains foreign data.") from error
        return InputPlumberChange(self._record_owner, *values)

    def _write_pending(self, change, replacing=None):
        def check_previous():
            pending = self._read_pending()
            if replacing is None:
                matches = pending is None
            else:
                matches = pending is not None and (pending._before, pending._after) == (replacing._before, replacing._after)
            if not matches:
                raise InputPlumberUpdateError("The InputPlumber recovery journal changed; it was preserved.")

        check_previous()
        self._ensure_directory(self.state_root)
        path = self.state_root / _JOURNAL
        data = {"owner": "DeckyZone InputPlumber updater v1",
                "previous": change._before.decode() if change._before is not None else None,
                "target": change._after.decode() if change._after is not None else None}
        descriptor, name = tempfile.mkstemp(prefix=".transaction-", dir=self.state_root)
        temporary = Path(name)
        try:
            with os.fdopen(descriptor, "w", encoding="utf-8") as output:
                json.dump(data, output)
                output.flush()
                os.fsync(output.fileno())
            os.chmod(temporary, 0o600)
            os.chown(temporary, self.owner_uid, self.owner_gid)
            check_previous()
            os.replace(temporary, path)
        finally:
            if temporary.exists():
                temporary.unlink()

    def _clear_pending(self, change):
        pending = self._read_pending()
        if pending is None:
            return
        if (pending._before, pending._after) != (change._before, change._after):
            raise InputPlumberUpdateError("The InputPlumber recovery journal changed; it was preserved.")
        (self.state_root / _JOURNAL).unlink()

    def _service_info(self):
        result = self._run([_SYSTEMCTL, "show", _SERVICE, "--no-pager",
                            "--property=FragmentPath,DropInPaths,ExecStart,MainPID,ActiveState"])
        if result.returncode != 0:
            raise InputPlumberUpdateError("The OS InputPlumber service is unavailable.")
        return dict(line.split("=", 1) for line in (result.stdout or "").splitlines() if "=" in line)

    def _guard_service(self, require_active=False, extra_binaries=()):
        info = self._service_info()
        fragment = Path(info.get("FragmentPath", ""))
        if fragment not in self.unit_paths:
            raise InputPlumberUpdateError("A custom InputPlumber service prevents a managed update.")
        if fragment.is_symlink():
            raise InputPlumberUpdateError("A symlinked InputPlumber service prevents a managed update.")
        # /lib is a distro-owned usr-merge alias on some systems; validate its real unit path.
        self._secure_path(fragment.resolve(), "file")
        try:
            dropins = shlex.split(info.get("DropInPaths", ""))
        except ValueError as error:
            raise InputPlumberUpdateError("InputPlumber drop-in discovery was ambiguous.") from error
        if any(path != str(self.dropin) for path in dropins):
            raise InputPlumberUpdateError("Another InputPlumber service drop-in prevents a managed update.")
        self._read_dropin()
        self._secure_path(self.system_binary, "file")
        executable = re.findall(r"(?:^|[\s{])path=([^ ;}]+)", info.get("ExecStart", ""))
        _, managed_version = self._read_dropin()
        allowed = {str(self.system_binary)}
        allowed.update(str(path) for path in extra_binaries)
        if managed_version:
            allowed.add(str(self.releases / managed_version / "usr/bin/inputplumber"))
        if len(executable) != 1 or executable[0] not in allowed:
            raise InputPlumberUpdateError("The InputPlumber service uses a foreign executable.")
        if require_active and info.get("ActiveState") != "active":
            raise InputPlumberUpdateError("Start the system InputPlumber service before updating it.")
        return info

    def _process_binary(self, info):
        pid = info.get("MainPID", "")
        if not re.fullmatch(r"[1-9][0-9]*", pid):
            return None
        try:
            return Path(os.readlink(self.proc_root / pid / "exe"))
        except OSError:
            return None

    def _release_files(self, version):
        self._version_tuple(version)
        release = self.releases / version
        self._secure_path(release, "dir")
        metadata_path = release / _MANIFEST
        self._secure_path(metadata_path, "file")
        if metadata_path.stat().st_size > 1024 * 1024:
            raise InputPlumberUpdateError("The managed release manifest is too large.")
        try:
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        except (OSError, ValueError) as error:
            raise InputPlumberUpdateError("The managed release manifest is invalid.") from error
        if not isinstance(metadata, dict):
            raise InputPlumberUpdateError("The managed release manifest is invalid.")
        files = metadata.get("files")
        if (metadata.get("owner") != "DeckyZone InputPlumber updater v1" or metadata.get("version") != version
                or not re.fullmatch(r"[0-9a-f]{64}", str(metadata.get("archiveSha256", "")))
                or not isinstance(files, dict) or not 2 <= len(files) <= MAX_ARCHIVE_ENTRIES):
            raise InputPlumberUpdateError("The managed release manifest is invalid.")
        required = {"usr/bin/inputplumber", "usr/share/inputplumber/profiles/default.yaml",
                    "usr/share/inputplumber/devices/50-zotac-zone.yaml"}
        if not required <= files.keys():
            raise InputPlumberUpdateError("The managed release lacks required matching controller data.")
        for relative, expected in files.items():
            if not self._selected_file(relative) or not re.fullmatch(r"[0-9a-f]{64}", str(expected)):
                raise InputPlumberUpdateError("The managed release manifest contains an invalid path or digest.")
            if self._digest(release / relative) != expected:
                raise InputPlumberUpdateError("A managed InputPlumber release file changed; it was left unchanged.")
        actual = set()
        for path in release.rglob("*"):
            self._secure_path(path)
            if path.is_file() and path.name != _MANIFEST:
                actual.add(path.relative_to(release).as_posix())
            elif not path.is_dir() and path.name != _MANIFEST:
                raise InputPlumberUpdateError("The managed release contains an unexpected file type.")
        if actual != files.keys():
            raise InputPlumberUpdateError("The managed release contains unexpected files.")
        return metadata

    def _managed_release(self):
        _, version = self._read_dropin()
        if version is None:
            return None
        info = self._guard_service()
        binary = self.releases / version / "usr/bin/inputplumber"
        if info.get("ActiveState") != "active" or self._process_binary(info) != binary:
            return None
        self._release_files(version)
        if self._binary_version(binary) != version:
            raise InputPlumberUpdateError("The active managed InputPlumber version does not match its release.")
        return version

    def active_binary_path(self):
        try:
            version = self._managed_release()
        except InputPlumberUpdateError:
            version = None
        return self.releases / version / "usr/bin/inputplumber" if version else self.system_binary

    def data_path(self, relative):
        path = PurePosixPath(relative)
        if not relative or path.is_absolute() or ".." in path.parts or "\\" in relative or path.as_posix() != relative:
            raise InputPlumberUpdateError("Invalid InputPlumber data path.")
        try:
            version = self._managed_release()
        except InputPlumberUpdateError:
            version = None
        base = self.releases / version / "usr/share/inputplumber" if version else self.system_data
        return base / relative

    @contextmanager
    def _operation(self):
        if not self._operation_lock.acquire(blocking=False):
            raise InputPlumberUpdateError("An InputPlumber update or restore is already running.")
        self._busy = True
        try:
            self._require_supported()
            yield
        finally:
            self._busy = False
            self._operation_lock.release()

    @staticmethod
    def _https_context():
        try:
            import certifi
        except ImportError:
            return ssl.create_default_context()
        # Loader bundles certifi because its packaged Python may lack usable
        # OpenSSL default CA paths. Match Loader's verified download context.
        return ssl.create_default_context(cafile=certifi.where())

    def _download(self, url, maximum):
        try:
            opener = urllib.request.build_opener(
                _ReleaseRedirects(), urllib.request.HTTPSHandler(context=self._https_context()))
            request = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json" if url == RELEASE_API_URL else "application/octet-stream",
                                                           "User-Agent": "DeckyZone-InputPlumber-Updater"})
            with opener.open(request, timeout=NETWORK_TIMEOUT_SECONDS) as response:
                size = response.headers.get("Content-Length")
                if size and (not size.isdigit() or int(size) > maximum):
                    raise InputPlumberUpdateError("The upstream InputPlumber download exceeds its size limit.")
                result = bytearray()
                deadline = time.monotonic() + 60
                while True:
                    chunk = response.read(min(65536, maximum + 1 - len(result)))
                    if not chunk:
                        return bytes(result)
                    result.extend(chunk)
                    if len(result) > maximum or time.monotonic() > deadline:
                        raise InputPlumberUpdateError("The upstream InputPlumber download exceeds its size or time limit.")
        except InputPlumberUpdateError:
            raise
        except (OSError, ValueError) as error:
            reason = error.reason if isinstance(error, urllib.error.URLError) else error
            if isinstance(reason, ssl.SSLCertVerificationError):
                raise InputPlumberUpdateError("TLS certificate verification failed while contacting GitHub. Check the device date and network connection, then try again.") from error
            raise InputPlumberUpdateError("Could not download the official InputPlumber release.") from error

    def _fetch_latest(self):
        try:
            metadata = json.loads(self._download(RELEASE_API_URL, 1024 * 1024))
        except (ValueError, TypeError) as error:
            raise InputPlumberUpdateError("The upstream InputPlumber release metadata is invalid.") from error
        if not isinstance(metadata, dict) or metadata.get("draft") is not False or metadata.get("prerelease") is not False:
            raise InputPlumberUpdateError("The upstream InputPlumber release is not stable.")
        tag = metadata.get("tag_name", "")
        if not isinstance(tag, str) or not re.fullmatch("v" + _VERSION, tag):
            raise InputPlumberUpdateError("The upstream InputPlumber release version is invalid.")
        assets = metadata.get("assets")
        if not isinstance(assets, list):
            raise InputPlumberUpdateError("The upstream InputPlumber release has no asset list.")
        selected = {}
        for name, limit in ((ARCHIVE_NAME, MAX_ARCHIVE_BYTES), (CHECKSUM_NAME, 1024)):
            candidates = [asset for asset in assets if isinstance(asset, dict) and asset.get("name") == name]
            expected_url = RELEASE_URL_PREFIX + tag + "/" + name
            if len(candidates) != 1:
                raise InputPlumberUpdateError("The upstream InputPlumber release asset is missing or ambiguous.")
            asset = candidates[0]
            digest = asset.get("digest", "")
            size = asset.get("size")
            if (asset.get("browser_download_url") != expected_url or not isinstance(digest, str)
                    or not re.fullmatch(r"sha256:[0-9a-f]{64}", digest)
                    or type(size) is not int or not 0 < size <= limit):
                raise InputPlumberUpdateError("The upstream InputPlumber asset URL, SHA256, or size is invalid.")
            selected[name] = {"url": expected_url, "sha256": digest[7:], "size": size}
        release = {"version": tag[1:], "assets": selected}
        self._release = release
        self._checked_at = int(time.time() * 1000)
        self._check_error = None
        return release

    @staticmethod
    def _selected_file(relative):
        if not isinstance(relative, str):
            return False
        path = PurePosixPath(relative)
        return (not path.is_absolute() and ".." not in path.parts
                and "\\" not in relative and path.as_posix() == relative
                and (relative == "usr/bin/inputplumber" or relative.startswith("usr/share/inputplumber/")))

    def _extract_release(self, payload, destination, version, archive_sha):
        import tarfile

        files = {}
        seen = set()
        total = 0
        try:
            # Bound decompression before tarfile parses extension headers such as PAX.
            # Those headers are consumed internally before individual member checks.
            with gzip.GzipFile(fileobj=io.BytesIO(payload)) as compressed:
                unpacked = compressed.read(MAX_UNPACKED_BYTES + 1)
            if len(unpacked) > MAX_UNPACKED_BYTES:
                raise InputPlumberUpdateError("The InputPlumber archive exceeds its unpacked size limit.")
            with tarfile.open(fileobj=io.BytesIO(unpacked), mode="r|") as archive:
                for index, member in enumerate(archive):
                    relative = PurePosixPath(member.name)
                    if (index >= MAX_ARCHIVE_ENTRIES or len(member.name) > 512
                            or relative.is_absolute() or ".." in relative.parts or "\\" in member.name
                            or not relative.parts or relative.parts[0] != "inputplumber"
                            or relative.as_posix() != member.name.rstrip("/") or member.name in seen
                            or not (member.isfile() or member.isdir())):
                        raise InputPlumberUpdateError("The official InputPlumber archive has an unsafe or unexpected entry.")
                    seen.add(member.name)
                    total += member.size
                    if member.size < 0 or total > MAX_UNPACKED_BYTES:
                        raise InputPlumberUpdateError("The InputPlumber archive exceeds its unpacked size limit.")
                    stripped = PurePosixPath(*relative.parts[1:]).as_posix()
                    if not member.isfile() or not self._selected_file(stripped):
                        continue
                    target = destination / stripped
                    self._ensure_directory(target.parent)
                    source = archive.extractfile(member)
                    if source is None:
                        raise InputPlumberUpdateError("The InputPlumber archive entry cannot be read.")
                    with source, target.open("xb") as output:
                        shutil.copyfileobj(source, output, 65536)
                    os.chmod(target, 0o755 if stripped == "usr/bin/inputplumber" else 0o644)
                    os.chown(target, self.owner_uid, self.owner_gid)
                    files[stripped] = self._digest(target)
        except InputPlumberUpdateError:
            raise
        except (OSError, EOFError, ValueError, tarfile.TarError) as error:
            raise InputPlumberUpdateError("The official InputPlumber archive could not be safely unpacked.") from error
        required = {"usr/bin/inputplumber", "usr/share/inputplumber/profiles/default.yaml",
                    "usr/share/inputplumber/devices/50-zotac-zone.yaml"}
        if not required <= files.keys():
            raise InputPlumberUpdateError("The InputPlumber release lacks its binary or matching controller data.")
        metadata = {"owner": "DeckyZone InputPlumber updater v1", "version": version,
                    "archiveSha256": archive_sha, "files": files}
        metadata_path = destination / _MANIFEST
        metadata_path.write_text(json.dumps(metadata, sort_keys=True) + "\n", encoding="utf-8")
        os.chmod(metadata_path, 0o644)
        os.chown(metadata_path, self.owner_uid, self.owner_gid)

    def prepare_latest(self, expected_version=None):
        with self._operation():
            self._guard_service(require_active=True)
            release = self._release or self._fetch_latest()
            version = release["version"]
            if expected_version is not None and version != expected_version:
                raise InputPlumberUpdateError("The checked InputPlumber release changed. Check again before confirming the update.")
            self._version_tuple(version)
            self._ensure_directory(self.releases)
            destination = self.releases / version
            asset = release["assets"][ARCHIVE_NAME]
            if destination.exists() or destination.is_symlink():
                previous = self._release_files(version)
                if previous["archiveSha256"] != asset["sha256"]:
                    raise InputPlumberUpdateError("A different managed release already occupies this version; it was preserved.")
                if self._binary_version(destination / "usr/bin/inputplumber") != version:
                    raise InputPlumberUpdateError("The prepared InputPlumber binary has the wrong version.")
                return version
            checksum_asset = release["assets"][CHECKSUM_NAME]
            checksum = self._download(checksum_asset["url"], 1024)
            if len(checksum) != checksum_asset["size"] or hashlib.sha256(checksum).hexdigest() != checksum_asset["sha256"]:
                raise InputPlumberUpdateError("The upstream InputPlumber checksum file failed SHA256 verification.")
            if checksum.decode("ascii", "replace").strip() != asset["sha256"] + "  " + ARCHIVE_NAME:
                raise InputPlumberUpdateError("The upstream InputPlumber checksum does not match its release metadata.")
            payload = self._download(asset["url"], MAX_ARCHIVE_BYTES)
            if len(payload) != asset["size"] or hashlib.sha256(payload).hexdigest() != asset["sha256"]:
                raise InputPlumberUpdateError("The official InputPlumber archive failed SHA256 verification.")
            staging = Path(tempfile.mkdtemp(prefix=".stage-", dir=self.releases))
            identity = staging.stat()
            try:
                os.chown(staging, self.owner_uid, self.owner_gid)
                self._extract_release(payload, staging, version, asset["sha256"])
                if self._binary_version(staging / "usr/bin/inputplumber") != version:
                    raise InputPlumberUpdateError("The staged InputPlumber binary has the wrong version.")
                if destination.exists() or destination.is_symlink():
                    raise InputPlumberUpdateError("The release destination changed while preparing the update.")
                staging.rename(destination)
                self._release_files(version)
                return version
            finally:
                if staging.exists() and not staging.is_symlink():
                    current = staging.stat()
                    if (current.st_dev, current.st_ino) == (identity.st_dev, identity.st_ino):
                        shutil.rmtree(staging)

    def _replace_dropin(self, expected, replacement):
        current, _ = self._read_dropin()
        if current != expected:
            raise InputPlumberUpdateError("InputPlumber configuration changed during the operation; the new configuration was preserved.")
        if replacement is None:
            if current is not None:
                self._secure_path(self.dropin, "file")
                self.dropin.unlink()
            return
        self._ensure_directory(self.dropin.parent)
        descriptor, name = tempfile.mkstemp(prefix=".deckyzone-updater-", dir=self.dropin.parent)
        temporary = Path(name)
        try:
            with os.fdopen(descriptor, "wb") as output:
                output.write(replacement)
                output.flush()
                os.fsync(output.fileno())
            os.chmod(temporary, 0o644)
            os.chown(temporary, self.owner_uid, self.owner_gid)
            current, _ = self._read_dropin()
            if current != expected:
                raise InputPlumberUpdateError("InputPlumber configuration changed during the operation; the new configuration was preserved.")
            os.replace(temporary, self.dropin)
        finally:
            if temporary.exists():
                temporary.unlink()

    def _activate(self, expected_binary):
        self._run([_SYSTEMCTL, "daemon-reload"], checked=True)
        self._run([_SYSTEMCTL, "restart", _SERVICE], timeout=30, checked=True)
        deadline = time.monotonic() + ACTIVATION_TIMEOUT_SECONDS
        while True:
            info = self._guard_service()
            if info.get("ActiveState") == "active" and self._process_binary(info) == expected_binary:
                result = self._run([_BUSCTL, "--system", "status", "org.shadowblip.InputPlumber"], timeout=3)
                if result.returncode == 0:
                    return
            if time.monotonic() >= deadline:
                raise InputPlumberUpdateError("InputPlumber did not expose the expected running binary and D-Bus service.")
            time.sleep(0.25)

    def _restore_change(self, change):
        if not isinstance(change, InputPlumberChange) or change._owner is not self._record_owner:
            raise InputPlumberUpdateError("Invalid InputPlumber rollback record.")
        binary = self._validated_binary(change._before)
        self._replace_dropin(change._after, change._before)
        self._activate(binary)

    def _validated_binary(self, content):
        version = self._dropin_version(content)
        if version:
            self._release_files(version)
        binary = self.releases / version / "usr/bin/inputplumber" if version else self.system_binary
        actual = self._binary_version(binary)
        if version is not None and actual != version:
            raise InputPlumberUpdateError("The previous InputPlumber binary does not match its managed release.")
        return binary

    def _recover_change(self, change):
        current, _ = self._read_dropin()
        if current not in (change._before, change._after):
            raise InputPlumberUpdateError("InputPlumber configuration changed after interruption; the foreign changes were preserved.")
        # Never publish an old path until its files and current OS compatibility pass.
        binary = self._validated_binary(change._before)
        if current == change._after:
            self._replace_dropin(change._after, change._before)
        self._activate(binary)
        self._clear_pending(change)

    def _pending_binaries(self, pending):
        if pending is None:
            return ()
        return tuple(self.releases / version / "usr/bin/inputplumber"
                     for content in (pending._before, pending._after)
                     if (version := self._dropin_version(content)) is not None)

    def recover_pending(self):
        """Recover an interrupted authorized change before normal plugin startup."""
        with self._operation():
            pending = self._read_pending()
            if pending is None:
                return False
            self._guard_service(extra_binaries=self._pending_binaries(pending))
            self._recover_change(pending)
            return True

    def switch(self, version):
        with self._operation():
            pending = self._read_pending()
            if pending is not None:
                if version is not None:
                    raise InputPlumberUpdateError("An interrupted InputPlumber change needs recovery before updating.")
                self._guard_service(extra_binaries=self._pending_binaries(pending))
                current, _ = self._read_dropin()
                if current not in (pending._before, pending._after):
                    raise InputPlumberUpdateError("InputPlumber configuration changed after interruption; the foreign changes were preserved.")
                binary = self._validated_binary(None)
                if current is None:
                    # Explicit restore can finish an interrupted restore even if its
                    # previous managed release is now absent or incompatible.
                    self._activate(binary)
                    self._clear_pending(pending)
                    return InputPlumberChange(self._record_owner, None, None)
            else:
                self._guard_service(require_active=version is not None)
            before, _ = self._read_dropin()
            if version is None:
                if before is None:
                    raise InputPlumberUpdateError("No DeckyZone-managed InputPlumber update is installed.")
                after = None
                binary = self.system_binary
                self._binary_version(binary)
            else:
                self._release_files(version)
                binary = self.releases / version / "usr/bin/inputplumber"
                if self._binary_version(binary) != version:
                    raise InputPlumberUpdateError("The prepared InputPlumber binary has the wrong version.")
                after = self._dropin_bytes(version)
            change = InputPlumberChange(self._record_owner, before, after)
            if before == after:
                return change
            self._write_pending(change, replacing=pending)
            try:
                self._replace_dropin(before, after)
                self._activate(binary)
                self._clear_pending(change)
            except Exception as error:
                try:
                    self._recover_change(change)
                except Exception as rollback_error:
                    raise InputPlumberUpdateError("InputPlumber activation failed and automatic rollback could not be verified. The previous release files were kept.") from rollback_error
                raise InputPlumberUpdateError("InputPlumber activation failed; the previous configuration was restored.") from error
            return change

    def rollback(self, change):
        with self._operation():
            self._guard_service()
            if not isinstance(change, InputPlumberChange) or change._owner is not self._record_owner:
                raise InputPlumberUpdateError("Invalid InputPlumber rollback record.")
            if change._before == change._after:
                return
            current, _ = self._read_dropin()
            if current != change._after:
                raise InputPlumberUpdateError("InputPlumber configuration changed; rollback left the newer configuration unchanged.")
            self._write_pending(change)
            self._restore_change(change)
            self._clear_pending(change)

    def get_status(self, check_latest=False):
        supported = self._supported()
        status = {"supported": supported, "available": False, "managed": False,
                  "activeVersion": None, "systemVersion": None,
                  "latestVersion": self._release["version"] if self._release else None,
                  "updateAvailable": False, "canRestore": False, "busy": self._busy,
                  "message": None, "checkedAt": self._checked_at, "checkError": self._check_error}
        if not supported:
            status["message"] = "Manual InputPlumber updates are available only on SteamOS x86_64."
            return status
        try:
            self._require_supported()
            status["systemVersion"] = self._binary_version(self.system_binary)
            content, version = self._read_dropin()
            status["managed"] = content is not None
            pending = self._read_pending()
            info = self._guard_service(extra_binaries=self._pending_binaries(pending))
            status["canRestore"] = content is not None or pending is not None
            binary = self.releases / version / "usr/bin/inputplumber" if version else self.system_binary
            if info.get("ActiveState") == "active" and self._process_binary(info) == binary:
                if version:
                    self._release_files(version)
                status["activeVersion"] = self._binary_version(binary)
                if version and status["activeVersion"] != version:
                    raise InputPlumberUpdateError("The active InputPlumber binary does not match its managed release.")
                status["available"] = True
            else:
                status["message"] = "InputPlumber is not running the expected service binary. Restore the system version to recover."
            if pending is not None:
                status["available"] = False
                status["message"] = "An interrupted InputPlumber change needs recovery. Restart DeckyZone or restore the system version."
        except InputPlumberUpdateError as error:
            status["message"] = str(error)
            status["available"] = False
        if check_latest:
            try:
                with self._operation():
                    self._fetch_latest()
            except InputPlumberUpdateError as error:
                self._check_error = str(error)
        status["latestVersion"] = self._release["version"] if self._release else None
        status["checkedAt"] = self._checked_at
        status["checkError"] = self._check_error
        status["updateAvailable"] = bool(status["latestVersion"] and status["activeVersion"] and
            self._version_tuple(status["latestVersion"]) > self._version_tuple(status["activeVersion"]))
        status["busy"] = self._busy
        return status
