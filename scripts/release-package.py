#!/usr/bin/env python3
"""Create and verify the runtime archives and release-job transfer files."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import gzip
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
import tarfile
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
PLUGIN = "DeckyZone"
TRANSFER_FILES = frozenset({
    "DeckyZone.zip", "DeckyZone.tar.gz", "package.json", "CHANGELOG.md", "CHANGES.md",
})
MANIFEST_NAME = "release-manifest.json"
RELEASE_FILES = ("package.json", "CHANGELOG.md", "CHANGES.md")
ROOT_FILES = ("main.py", "package.json", "plugin.json", "README.md", "LICENSE")
REQUIRED_RUNTIME_FILES = frozenset((
    *ROOT_FILES,
    "dist/index.js",
    "assets/gamescope/zotac.zone.oled.lua",
    "assets/gamescope/zotac.zone.green-tint.lua",
))
NATIVE_PREFIX = "assets/native-performance/"
NATIVE_REQUIRED_FILES = frozenset({
    "bin/ryzenadj",
    "services/performance_bridge/__init__.py",
    "services/performance_bridge/__main__.py",
    "services/performance_bridge/compatibility.py",
    "services/performance_bridge/control.py",
    "services/performance_bridge/controller.py",
    "services/performance_bridge/dbus_service.py",
    "services/performance_bridge/install.py",
    "services/performance_bridge/lifecycle.py",
    "services/performance_bridge/probe.py",
    "services/performance_bridge/ryzenadj.py",
    "services/performance_bridge/sysfs.py",
    "services/performance_bridge/requirements.txt",
    "services/performance_bridge/packaging/com.deckyzone.Performance.conf.example",
    "services/performance_bridge/packaging/deckyzone-performance.service",
    "services/performance_bridge/packaging/deckyzone-performance.toml.example",
    "vendor/dbus_next/__init__.py",
    "vendor/dbus_next/aio/message_bus.py",
    "vendor/dbus_next/service.py",
    "vendor/dbus_next-0.2.3.dist-info/LICENSE",
    "licenses/GPL-3.0.txt",
    "licenses/RyzenAdj-LICENSE",
    "licenses/RyzenAdj-source.tar.gz",
    "licenses/RyzenAdj.txt",
})
EXCLUDED_PARTS = frozenset({
    ".git", ".github", ".venv", "venv", "node_modules", ".pnpm-store", "src",
    "tests", "test", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache",
    "coverage", "htmlcov",
})
EXCLUDED_NAMES = frozenset({
    ".keep", ".ds_store", "thumbs.db", ".coverage", ".npmrc", ".pypirc",
    "credentials", "credentials.json", "secrets.json", "secrets.yaml", "secrets.yml",
    "auth.json", "id_rsa", "id_ed25519",
})
EXCLUDED_SUFFIXES = (
    ".pyc", ".pyo", ".key", ".p12", ".pfx", ".jks", ".keystore", ".ts", ".tsx", ".jsx",
)
VERSION_RE = re.compile(r"(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\Z")
SHA_RE = re.compile(r"[0-9a-f]{40}\Z")
HASH_RE = re.compile(r"[0-9a-f]{64}\Z")


class PackageError(ValueError):
    """An input or artifact does not satisfy the release contract."""


@dataclass(frozen=True)
class RuntimeFile:
    data: bytes
    mode: int

    @property
    def sha256(self) -> str:
        return hashlib.sha256(self.data).hexdigest()


def excluded(path: PurePosixPath) -> bool:
    names = tuple(part.lower() for part in path.parts)
    return (
        any(part in EXCLUDED_PARTS for part in names)
        or any(part.startswith(".env") for part in names)
        or names[-1] in EXCLUDED_NAMES
        or names[-1].endswith(EXCLUDED_SUFFIXES)
        or (names[-1].endswith(".map") and (
            names[0] == "dist" or names[:2] == ("deckyzone", "dist")
        ))
        or ".test." in names[-1]
        or ".spec." in names[-1]
        or names[-1].startswith("test_")
    )


def validate_path(name: str) -> PurePosixPath:
    if not isinstance(name, str) or "\\" in name or "\0" in name:
        raise PackageError("Invalid artifact path")
    path = PurePosixPath(name)
    if path.is_absolute() or not path.parts or ".." in path.parts or path.as_posix() != name:
        raise PackageError(f"Invalid artifact path: {name}")
    if excluded(path):
        raise PackageError(f"Forbidden runtime path: {name}")
    return path


def normal_directory(path: Path) -> None:
    if not stat.S_ISDIR(path.lstat().st_mode):
        raise PackageError(f"Expected a directory without a symlink: {path}")


def normal_file(path: Path) -> RuntimeFile:
    metadata = path.lstat()
    if not stat.S_ISREG(metadata.st_mode):
        raise PackageError(f"Expected a regular file without a symlink: {path}")
    mode = stat.S_IMODE(metadata.st_mode)
    if mode & ~0o777:
        raise PackageError(f"Special file permissions are not allowed: {path}")
    data = path.read_bytes()
    if path.suffix.lower() == ".pem" and b"PRIVATE KEY-----" in data:
        raise PackageError(f"Private-key material is not allowed: {path}")
    return RuntimeFile(data, mode)


def unique_object(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result = {}
    for key, value in pairs:
        if key in result:
            raise PackageError(f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(data: bytes) -> object:
    return json.loads(data.decode("utf-8"), object_pairs_hook=unique_object)


def require_version(version: object) -> str:
    if not isinstance(version, str) or not VERSION_RE.fullmatch(version):
        raise PackageError("Release version must be a stable X.Y.Z version")
    return version


def require_source_sha(source_sha: object) -> str:
    if not isinstance(source_sha, str) or not SHA_RE.fullmatch(source_sha):
        raise PackageError("Source SHA must be 40 lowercase hexadecimal characters")
    return source_sha


def collect_tree(source: Path, prefix: str, files: dict[str, RuntimeFile]) -> None:
    normal_directory(source)
    for current, directories, filenames in os.walk(source, followlinks=False):
        relative = Path(current).relative_to(source)
        kept_directories = []
        for name in sorted(directories):
            target = PurePosixPath(prefix) / relative.as_posix() / name
            if excluded(target):
                continue
            normal_directory(Path(current) / name)
            kept_directories.append(name)
        directories[:] = kept_directories
        for name in sorted(filenames):
            target = PurePosixPath(prefix) / relative.as_posix() / name
            if excluded(target):
                continue
            key = target.as_posix()
            validate_path(key)
            if key in files:
                raise PackageError(f"Duplicate runtime file: {key}")
            files[key] = normal_file(Path(current) / name)


def validate_native(files: dict[str, RuntimeFile], required: bool = False) -> None:
    native = {name[len(NATIVE_PREFIX):]: item for name, item in files.items()
              if name.startswith(NATIVE_PREFIX)}
    if not native and not required:
        return
    if "payload.json" not in native:
        raise PackageError("Native performance assets require payload.json")
    payload = read_json(native["payload.json"].data)
    if not isinstance(payload, dict):
        raise PackageError("Native performance payload.json must be a hash mapping")
    actual = set(native) - {"payload.json"}
    if set(payload) != actual:
        raise PackageError("Native performance manifest must cover every payload file exactly")
    if not NATIVE_REQUIRED_FILES.issubset(actual):
        missing = ", ".join(sorted(NATIVE_REQUIRED_FILES - actual))
        raise PackageError(f"Native performance payload is missing required files: {missing}")
    for name, digest in payload.items():
        validate_path(name)
        if not isinstance(digest, str) or not HASH_RE.fullmatch(digest):
            raise PackageError(f"Invalid native performance hash: {name}")
        if native[name].sha256 != digest:
            raise PackageError(f"Native performance checksum mismatch: {name}")
    if not native["bin/ryzenadj"].mode & 0o111:
        raise PackageError("The packaged RyzenAdj binary must be executable")


def validate_runtime(files: dict[str, RuntimeFile], version: str, native_required: bool = False) -> None:
    for name, item in files.items():
        path = validate_path(name)
        if name not in ROOT_FILES and (len(path.parts) < 2 or path.parts[0] not in {"dist", "py_modules", "assets"}):
            raise PackageError(f"Unexpected runtime path: {name}")
        if path.suffix.lower() == ".pem" and b"PRIVATE KEY-----" in item.data:
            raise PackageError(f"Private-key material is not allowed: {name}")
    if not REQUIRED_RUNTIME_FILES.issubset(files):
        missing = ", ".join(sorted(REQUIRED_RUNTIME_FILES - set(files)))
        raise PackageError(f"Runtime archive is missing required files: {missing}")
    if not any(name.startswith("py_modules/") and name.endswith(".py") for name in files):
        raise PackageError("Runtime archive must contain Python backend modules")
    package = read_json(files["package.json"].data)
    plugin = read_json(files["plugin.json"].data)
    if not isinstance(package, dict) or package.get("version") != version:
        raise PackageError("Packaged package.json version does not match the release")
    if package.get("name") != "deckyzone":
        raise PackageError("Packaged package.json name must be deckyzone")
    if not isinstance(plugin, dict) or plugin.get("name") != PLUGIN:
        raise PackageError("Packaged plugin.json name must be DeckyZone")
    validate_native(files, native_required)


def collect_runtime(version: str) -> dict[str, RuntimeFile]:
    files = {name: normal_file(ROOT / name) for name in ROOT_FILES}
    collect_tree(ROOT / "dist", "dist", files)
    collect_tree(ROOT / "py_modules", "py_modules", files)
    defaults = ROOT / "defaults/assets"
    if os.path.lexists(defaults):
        collect_tree(defaults, "assets", files)
    native_required = os.path.lexists(defaults / "native-performance")
    validate_runtime(files, version, native_required)
    return files


def write_archives(output: Path, files: dict[str, RuntimeFile]) -> None:
    with zipfile.ZipFile(output / "DeckyZone.zip", "w", compression=zipfile.ZIP_DEFLATED,
                         compresslevel=9) as archive:
        for name, item in sorted(files.items()):
            info = zipfile.ZipInfo(f"{PLUGIN}/{name}", date_time=(1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | item.mode) << 16
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, item.data)
    with (output / "DeckyZone.tar.gz").open("wb") as raw:
        with gzip.GzipFile(filename="", mode="wb", fileobj=raw, mtime=0) as compressed:
            with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as archive:
                for name, item in sorted(files.items()):
                    info = tarfile.TarInfo(f"{PLUGIN}/{name}")
                    info.size = len(item.data)
                    info.mode = item.mode
                    info.uid = info.gid = 0
                    info.uname = info.gname = "root"
                    info.mtime = 0
                    archive.addfile(info, io.BytesIO(item.data))


def archive_path(name: str) -> str:
    path = validate_path(name)
    if len(path.parts) < 2 or path.parts[0] != PLUGIN:
        raise PackageError("Runtime archives must have one DeckyZone/ root")
    return PurePosixPath(*path.parts[1:]).as_posix()


def read_zip(path: Path) -> dict[str, RuntimeFile]:
    files = {}
    with zipfile.ZipFile(path) as archive:
        for info in archive.infolist():
            name = archive_path(info.filename)
            mode = info.external_attr >> 16
            if info.is_dir() or not stat.S_ISREG(mode) or info.flag_bits & 1:
                raise PackageError(f"ZIP entry must be an unencrypted regular file: {info.filename}")
            if stat.S_IMODE(mode) & ~0o777 or name in files:
                raise PackageError(f"Invalid permissions or duplicate ZIP entry: {info.filename}")
            files[name] = RuntimeFile(archive.read(info), stat.S_IMODE(mode))
    return files


def read_tar(path: Path) -> dict[str, RuntimeFile]:
    files = {}
    with tarfile.open(path, "r:gz") as archive:
        for info in archive:
            name = archive_path(info.name)
            if info.type not in (tarfile.REGTYPE, tarfile.AREGTYPE):
                raise PackageError(f"TAR entry must be a regular file: {info.name}")
            if info.mode & ~0o777 or name in files:
                raise PackageError(f"Invalid permissions or duplicate TAR entry: {info.name}")
            stream = archive.extractfile(info)
            if stream is None:
                raise PackageError(f"Missing TAR file data: {info.name}")
            with stream:
                data = stream.read()
            if len(data) != info.size:
                raise PackageError(f"Truncated TAR entry: {info.name}")
            files[name] = RuntimeFile(data, info.mode)
    return files


def validate_manifest(manifest: object) -> dict[str, object]:
    if not isinstance(manifest, dict) or set(manifest) != {"source_sha", "version", "tag", "files"}:
        raise PackageError("Release manifest has an invalid schema")
    require_source_sha(manifest["source_sha"])
    version = require_version(manifest["version"])
    if manifest["tag"] != f"v{version}":
        raise PackageError("Release manifest tag must match its version")
    files = manifest["files"]
    if not isinstance(files, dict) or set(files) != TRANSFER_FILES:
        raise PackageError("Release manifest must describe exactly the five transfer files")
    for name, entry in files.items():
        if not isinstance(entry, dict) or set(entry) != {"sha256", "size"}:
            raise PackageError(f"Invalid transfer-file manifest entry: {name}")
        if not isinstance(entry["sha256"], str) or not HASH_RE.fullmatch(entry["sha256"]):
            raise PackageError(f"Invalid transfer-file hash: {name}")
        if type(entry["size"]) is not int or entry["size"] < 0:
            raise PackageError(f"Invalid transfer-file size: {name}")
    return manifest


def verify(output: Path) -> dict[str, object]:
    normal_directory(output)
    if {path.name for path in output.iterdir()} != TRANSFER_FILES | {MANIFEST_NAME}:
        raise PackageError("Release directory must contain exactly five transfer files and its manifest")
    manifest = validate_manifest(read_json(normal_file(output / MANIFEST_NAME).data))
    transfers = {}
    for name, expected in manifest["files"].items():
        item = normal_file(output / name)
        if len(item.data) != expected["size"] or item.sha256 != expected["sha256"]:
            raise PackageError(f"Transfer-file checksum or size mismatch: {name}")
        transfers[name] = item
    zipped = read_zip(output / "DeckyZone.zip")
    tarred = read_tar(output / "DeckyZone.tar.gz")
    if zipped != tarred:
        raise PackageError("ZIP and TAR must contain identical runtime files, contents and permissions")
    validate_runtime(zipped, manifest["version"])
    if zipped["package.json"].data != transfers["package.json"].data:
        raise PackageError("Transferred package.json must equal the archived package.json")
    return manifest


def package(output: Path, source_sha: str, version: str) -> dict[str, object]:
    require_source_sha(source_sha)
    require_version(version)
    if output.resolve() == ROOT:
        raise PackageError("Release output must be separate from the source root")
    for tree in (ROOT / "dist", ROOT / "py_modules", ROOT / "defaults/assets"):
        if output.resolve().is_relative_to(tree.resolve()):
            raise PackageError("Release output must be outside runtime input directories")
    runtime = collect_runtime(version)
    releases = {name: normal_file(ROOT / name) for name in RELEASE_FILES}
    if releases["package.json"].data != runtime["package.json"].data:
        raise PackageError("package.json changed during packaging")
    if os.path.lexists(output):
        normal_directory(output)
        if any(path.name not in TRANSFER_FILES | {MANIFEST_NAME} for path in output.iterdir()):
            raise PackageError("Refusing to overwrite a directory containing unrelated files")
        for path in output.iterdir():
            normal_file(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".deckyzone-release-", dir=output.parent) as temporary:
        stage = Path(temporary)
        write_archives(stage, runtime)
        for name, item in releases.items():
            (stage / name).write_bytes(item.data)
        entries = {name: {"sha256": item.sha256, "size": len(item.data)}
                   for name in sorted(TRANSFER_FILES)
                   for item in [normal_file(stage / name)]}
        manifest = {"source_sha": source_sha, "version": version, "tag": f"v{version}", "files": entries}
        (stage / MANIFEST_NAME).write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        verify(stage)
        output.mkdir(exist_ok=True)
        for name in (*sorted(TRANSFER_FILES), MANIFEST_NAME):
            os.replace(stage / name, output / name)
    return verify(output)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--source-sha")
    parser.add_argument("--version")
    parser.add_argument("--verify", type=Path, metavar="DIR")
    args = parser.parse_args()
    if args.verify is not None:
        if any(value is not None for value in (args.output_dir, args.source_sha, args.version)):
            parser.error("--verify cannot be combined with packaging arguments")
    elif any(value is None for value in (args.output_dir, args.source_sha, args.version)):
        parser.error("packaging requires --output-dir, --source-sha and --version")
    try:
        if args.verify is not None:
            manifest = verify(args.verify)
            output = args.verify
        else:
            manifest = package(args.output_dir, args.source_sha, args.version)
            output = args.output_dir
        print(f"Verified {manifest['tag']} from {manifest['source_sha']} in {output}")
        return 0
    except (PackageError, OSError, EOFError, UnicodeError, json.JSONDecodeError,
            zipfile.BadZipFile, tarfile.TarError) as error:
        print(f"Release package error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
