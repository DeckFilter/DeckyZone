"""Standalone update activation, copied outside the live plugin before launch."""

from contextlib import contextmanager
import fcntl
import json
import os
from pathlib import Path
import shutil
import stat
import subprocess
import sys
import tempfile


STATE_FILE = "status.json"
INSTALL_UNIT = "deckyzone-plugin-update"
LOADER_UNIT = "plugin_loader.service"
BUSY_PHASES = frozenset({"checking", "downloading", "staging", "restarting"})


def empty_status():
    return {"phase": "idle", "channel": None, "release": None,
            "downloadedBytes": 0, "totalBytes": None, "error": None, "revision": 0}


def read_status(update_dir):
    try:
        with open(Path(update_dir) / STATE_FILE, encoding="utf-8") as handle:
            state = json.load(handle)
    except FileNotFoundError:
        return empty_status()
    if not isinstance(state, dict) or not isinstance(state.get("revision"), int):
        raise RuntimeError("The saved update status could not be read. Check for updates again.")
    return state


def write_status(update_dir, state):
    update_dir = Path(update_dir)
    update_dir.mkdir(parents=True, exist_ok=True, mode=0o700)
    state = dict(state, revision=read_status(update_dir)["revision"] + 1)
    with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=update_dir,
                                     prefix=".status-", delete=False) as handle:
        temporary = Path(handle.name)
        try:
            json.dump(state, handle)
            handle.flush()
            os.fsync(handle.fileno())
            os.replace(temporary, update_dir / STATE_FILE)
        finally:
            temporary.unlink(missing_ok=True)
    return state


def public_status(state):
    return {key: state.get(key, value) for key, value in empty_status().items()}


@contextmanager
def operation_lock(update_dir, *, wait=False):
    Path(update_dir).mkdir(parents=True, exist_ok=True, mode=0o700)
    with open(Path(update_dir) / "operation.lock", "a", encoding="utf-8") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | (0 if wait else fcntl.LOCK_NB))
        except BlockingIOError as error:
            raise RuntimeError("Wait for the update operation to finish.") from error
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def protected_update_directory(update_dir):
    requested = Path(update_dir)
    if not requested.is_absolute() or requested.is_symlink():
        raise RuntimeError("The update storage path must be a protected directory.")
    # /home itself may point to /var/home; the storage entry must not be a symlink.
    update_dir = requested.parent.resolve(strict=True) / requested.name
    for ancestor in update_dir.parents:
        metadata = ancestor.lstat()
        sticky_root = metadata.st_uid == 0 and metadata.st_mode & stat.S_ISVTX
        if (not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid not in (0, os.geteuid())
                or metadata.st_mode & 0o022 and not sticky_root):
            raise RuntimeError("The update storage directory has an untrusted parent.")
    try:
        update_dir.mkdir(mode=0o700)
    except FileExistsError:
        pass
    metadata = update_dir.lstat()
    if (not stat.S_ISDIR(metadata.st_mode) or metadata.st_uid != os.geteuid()
            or metadata.st_mode & 0o077):
        raise RuntimeError("The update storage directory must be owned by the plugin user with mode 0700.")
    return update_dir


def validate_paths(update_dir, plugin_dir):
    update_dir, plugin_dir = protected_update_directory(update_dir), Path(plugin_dir).resolve()
    if (plugin_dir.name != "DeckyZone" or plugin_dir.parent.name != "plugins"
            or update_dir == plugin_dir.parent or plugin_dir.parent in update_dir.parents
            or update_dir in plugin_dir.parents):
        raise RuntimeError("The update storage path is invalid.")
    return update_dir, plugin_dir


def validate_staged_plugin(plugin_dir, version):
    plugin_dir = Path(plugin_dir)
    if not plugin_dir.is_dir() or plugin_dir.is_symlink():
        raise RuntimeError("The downloaded plugin directory is invalid.")
    for name in ("main.py", "package.json", "plugin.json", "dist/index.js"):
        path = plugin_dir / name
        if not path.is_file() or path.is_symlink():
            raise RuntimeError(f"The downloaded release is missing {name}.")
    for directory, dirs, files in os.walk(plugin_dir):
        if any((Path(directory) / name).is_symlink() for name in dirs + files):
            raise RuntimeError("The downloaded release contains a symbolic link.")
    try:
        package = json.loads((plugin_dir / "package.json").read_text(encoding="utf-8"))
        plugin = json.loads((plugin_dir / "plugin.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as error:
        raise RuntimeError("The downloaded release has invalid plugin metadata.") from error
    if (not isinstance(package, dict) or package.get("version") != version
            or package.get("name") != "deckyzone"
            or not isinstance(plugin, dict) or plugin.get("name") != "DeckyZone"):
        raise RuntimeError("The downloaded package does not match the selected release.")


def remove_tree(path):
    path = Path(path)
    if not path.exists():
        return
    for directory, dirs, files in os.walk(path):
        for name in [".", *dirs, *files]:
            entry = Path(directory) / name
            if not entry.is_symlink():
                entry.chmod(stat.S_IMODE(entry.stat().st_mode) | stat.S_IWUSR)
    shutil.rmtree(path)


def install_update(update_dir, plugin_dir, *, command_runner=subprocess.run):
    update_dir, plugin_dir = validate_paths(update_dir, plugin_dir)
    pending, backup = update_dir / "pending", update_dir / "backup"
    # The launching RPC holds this gate until systemd acknowledges exec.
    with operation_lock(update_dir, wait=True):
        state = read_status(update_dir)
        state.update(phase="restarting", error=None, ownerPid=os.getpid())
        state = write_status(update_dir, state)
        stopped, moved_old, installed = False, False, False
        error = None
        try:
            validate_staged_plugin(pending, state["release"]["version"])
            if backup.exists():
                raise RuntimeError(f"A previous update backup needs recovery: {backup}")
            command_runner(["systemctl", "stop", LOADER_UNIT], check=True,
                           stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stopped = True
            if plugin_dir.exists():
                os.replace(plugin_dir, backup)
                moved_old = True
            try:
                os.replace(pending, plugin_dir)
                installed = True
            except BaseException:
                if moved_old:
                    os.replace(backup, plugin_dir)
                    moved_old = False
                raise
        except BaseException as failure:
            error = str(failure) or type(failure).__name__
        finally:
            result = empty_status() if installed and error is None else dict(state)
            if not installed or error is not None:
                result.update(phase="ready" if pending.exists() else "error", error=error)
            if installed:
                result["installedVersion"] = state["release"]["version"]
            result.pop("ownerPid", None)
            # The new frontend reads its settled state as soon as Loader starts.
            try:
                write_status(update_dir, result)
            except Exception as failure:
                detail = f"Could not save update status: {failure}"
                error = f"{error} {detail}" if error else detail
            # Even a timed-out stop may already have stopped Loader.
            if stopped or error is not None:
                try:
                    command_runner(["systemctl", "start", LOADER_UNIT], check=True,
                                   stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                except BaseException as failure:
                    detail = f"Could not start Decky Loader: {failure}"
                    error = f"{error} {detail}" if error else detail
                    result = dict(state, phase="error", error=error)
                    result.pop("ownerPid", None)
                    try:
                        write_status(update_dir, result)
                    except Exception:
                        pass
            if installed and error is None:
                try:
                    remove_tree(backup)
                except OSError:
                    # Keep the successful update; a later explicit download can clear its backup.
                    pass
        return error is None


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("Expected the update storage and plugin directory.")
    raise SystemExit(0 if install_update(sys.argv[1], sys.argv[2]) else 1)
