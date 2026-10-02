"""Build the offline native-performance payload from pinned dependencies."""

import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import shutil
import sys
import tarfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / "tmp/native-performance-deps"
TARGET = ROOT / "defaults/assets/native-performance"
DEPENDENCIES = {
    "GPL-3.0.txt": (
        "https://www.gnu.org/licenses/gpl-3.0.txt",
        "3972dc9744f6499f0f9b2dbf76696f2ae7ad8af9b23dde66d6af86c9dfb36986",
    ),
    "PowerControl.zip": (
        "https://github.com/mengmeet/PowerControl/releases/download/v3.15.1/PowerControl.zip",
        "9c14eddbec7657a23e73eaf811bd8344198159d48303481cf70ebb7c1c1ebd7c",
    ),
    "dbus-next.whl": (
        "https://files.pythonhosted.org/packages/d2/fc/c0a3f4c4eaa5a22fbef91713474666e13d0ea2a69c84532579490a9f2cc8/dbus_next-0.2.3-py3-none-any.whl",
        "58948f9aff9db08316734c0be2a120f6dc502124d9642f55e90ac82ffb16a18b",
    ),
    "RyzenAdj-source.tar.gz": (
        "https://codeload.github.com/FlyGoat/RyzenAdj/tar.gz/455944714f239e98fc600b308db100ddb599ed42",
        "64189207d3537dd1093abc74bc9106587862b4f10980dd193e04539bd96cb3d4",
    ),
}


def dependency(name):
    url, expected = DEPENDENCIES[name]
    cached = CACHE / name
    if not cached.is_file() or hashlib.sha256(cached.read_bytes()).hexdigest() != expected:
        with urllib.request.urlopen(url, timeout=30) as response:
            data = response.read(8 * 1024 * 1024)
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError(f"Dependency checksum mismatch: {name}")
        cached.write_bytes(data)
    return cached.read_bytes()


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    downloads = {name: dependency(name) for name in DEPENDENCIES}
    sys.path.insert(0, str(ROOT))
    from services.performance_bridge.ryzenadj import BINARY_SHA256

    with zipfile.ZipFile(io.BytesIO(downloads["PowerControl.zip"])) as archive:
        binary = archive.read("PowerControl/bin/ryzenadj")
    if hashlib.sha256(binary).hexdigest() != BINARY_SHA256:
        raise RuntimeError("Packaged RyzenAdj differs from the validated binary")
    shutil.rmtree(TARGET, ignore_errors=True)
    (TARGET / "bin").mkdir(parents=True)
    (TARGET / "bin/ryzenadj").write_bytes(binary)
    (TARGET / "bin/ryzenadj").chmod(0o755)
    shutil.copytree(ROOT / "services", TARGET / "services",
                    ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "tests"))
    with zipfile.ZipFile(io.BytesIO(downloads["dbus-next.whl"])) as archive:
        for name in archive.namelist():
            path = PurePosixPath(name)
            if path.is_absolute() or ".." in path.parts:
                raise RuntimeError("Invalid dependency archive path")
            if name.endswith("/") or not name.startswith(("dbus_next/", "dbus_next-0.2.3.dist-info/")):
                continue
            output = TARGET / "vendor" / name
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(archive.read(name))
    licenses = TARGET / "licenses"
    licenses.mkdir()
    (licenses / "GPL-3.0.txt").write_bytes(downloads["GPL-3.0.txt"])
    source = downloads["RyzenAdj-source.tar.gz"]
    (licenses / "RyzenAdj-source.tar.gz").write_bytes(source)
    with tarfile.open(fileobj=io.BytesIO(source), mode="r:gz") as archive:
        (licenses / "RyzenAdj-LICENSE").write_bytes(archive.extractfile(
            "RyzenAdj-455944714f239e98fc600b308db100ddb599ed42/LICENSE").read())
    (licenses / "RyzenAdj.txt").write_text(
        "RyzenAdj 0.18.0, LGPL-3.0. Source and license are included here.\n"
        "Source: https://github.com/FlyGoat/RyzenAdj/tree/455944714f239e98fc600b308db100ddb599ed42\n"
        "Binary: PowerControl v3.15.1, bin/ryzenadj (unmodified).\n"
        "Build recipe: https://github.com/mengmeet/PowerControl/blob/v3.15.1/.github/workflows/release.yml\n"
    )
    manifest = {str(p.relative_to(TARGET)): hashlib.sha256(p.read_bytes()).hexdigest()
                for p in sorted(TARGET.rglob("*")) if p.is_file()}
    (TARGET / "payload.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Native performance payload: {len(manifest)} files")


if __name__ == "__main__":
    main()
