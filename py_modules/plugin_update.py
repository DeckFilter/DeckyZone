import json
import os
from pathlib import Path, PurePosixPath
import shutil
import ssl
import subprocess
import tarfile
import tempfile
import time
import urllib.error
import urllib.request

import decky
from release_versions import normalize_version, parse_version
from plugin_update_install import (
    BUSY_PHASES, INSTALL_UNIT, empty_status, operation_lock, public_status,
    read_status, remove_tree, validate_paths, validate_staged_plugin, write_status,
)


PACKAGE_NAME = "DeckyZone"
RELEASE_API_URL = "https://api.github.com/repos/DeckFilter/DeckyZone/releases"
RELEASE_CHECK_TIMEOUT_SECONDS = 5
RELEASE_DOWNLOAD_TIMEOUT_SECONDS = 60
RELEASE_NOTES_LIMIT = 10
TARBALL_ASSET_NAME = f"{PACKAGE_NAME}.tar.gz"
UPDATE_CHANNELS = ("stable", "prerelease")
UPDATE_DIRECTORY = "/home/.deckyzone-updates"


def get_env():
    env = os.environ.copy()
    env["LD_LIBRARY_PATH"] = ""
    return env


def validate_channel(channel):
    if channel not in UPDATE_CHANNELS:
        raise ValueError("Select Stable or Pre-release as the update channel.")
    return channel


def _release_notes_ssl_context():
    context = ssl.create_default_context()
    # Decky's bundled Python may not use the distribution's CA bundle by default.
    for ca_bundle in (
        "/etc/ssl/certs/ca-certificates.crt",
        "/etc/pki/tls/certs/ca-bundle.crt",
        "/etc/pki/ca-trust/extracted/pem/tls-ca-bundle.pem",
    ):
        if os.path.isfile(ca_bundle):
            context.load_verify_locations(cafile=ca_bundle)
            break
    return context


def _fetch_json(url):
    request = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json", "User-Agent": PACKAGE_NAME,
    })
    with urllib.request.urlopen(request, context=_release_notes_ssl_context(),
                                timeout=RELEASE_CHECK_TIMEOUT_SECONDS) as response:
        return json.load(response)


def _fetch_releases():
    releases = []
    page = 1
    while True:
        batch = _fetch_json(f"{RELEASE_API_URL}?per_page=100&page={page}")
        if not isinstance(batch, list):
            raise RuntimeError("DeckyZone release history was not returned as a list.")
        releases.extend(batch)
        if len(batch) < 100:
            return releases
        page += 1


def _positive_id(value):
    return isinstance(value, int) and not isinstance(value, bool) and value > 0


def _eligible_releases(releases, channel):
    validate_channel(channel)
    eligible = []
    for release in releases:
        if not isinstance(release, dict) or release.get("draft") is not False:
            continue
        version = parse_version(release.get("tag_name"), allow_tag=True)
        if version is None or not _positive_id(release.get("id")):
            continue
        prerelease = version[3] == 0
        if release.get("prerelease") is not prerelease:
            continue
        if channel == "stable" and prerelease:
            continue
        if not isinstance(release.get("published_at"), str) or not release["published_at"]:
            continue
        eligible.append((version, release))
    return [release for _, release in sorted(eligible, key=lambda item: (item[0], item[1]["id"]), reverse=True)]


def _tarball_asset(release):
    assets = release.get("assets")
    matches = [asset for asset in assets if isinstance(asset, dict)
               and asset.get("name") == TARBALL_ASSET_NAME] if isinstance(assets, list) else []
    if len(matches) != 1:
        raise RuntimeError("The selected DeckyZone release tarball is unavailable. Check for updates again.")
    asset = matches[0]
    if (not _positive_id(asset.get("id")) or asset.get("state") != "uploaded"
            or not isinstance(asset.get("browser_download_url"), str)
            or not asset["browser_download_url"].startswith("https://github.com/DeckFilter/DeckyZone/releases/download/")):
        raise RuntimeError("The selected DeckyZone release tarball is unavailable. Check for updates again.")
    return asset


def _release_target(release):
    asset = _tarball_asset(release)
    return {
        "id": release["id"],
        "tagName": release["tag_name"],
        "version": normalize_version(release["tag_name"], allow_tag=True),
        "prerelease": release["prerelease"],
        "assetId": asset["id"],
    }


def get_update_release(channel="stable"):
    releases = _eligible_releases(_fetch_releases(), channel)
    # A broken newest release must remain visible as an error, not offer an older build.
    return _release_target(releases[0]) if releases else None


def get_latest_version():
    target = get_update_release("stable")
    if target is None:
        raise RuntimeError("No published stable DeckyZone release was found.")
    return target["version"]


def get_release_notes(channel="stable"):
    notes = []
    for release in _eligible_releases(_fetch_releases(), channel):
        url = release.get("html_url")
        if not isinstance(url, str) or not url:
            continue
        version = normalize_version(release["tag_name"], allow_tag=True)
        name = release.get("name")
        body = release.get("body")
        notes.append({
            "id": release["id"],
            "version": version,
            "name": name.strip() if isinstance(name, str) and name.strip() else version,
            "body": body if isinstance(body, str) else "",
            "publishedAt": release["published_at"],
            "url": url,
        })
        if len(notes) == RELEASE_NOTES_LIMIT:
            break
    return notes


def _verify_selected_release(channel, target):
    validate_channel(channel)
    if (not isinstance(target, dict) or not _positive_id(target.get("id"))
            or not _positive_id(target.get("assetId"))
            or not isinstance(target.get("prerelease"), bool)
            or not isinstance(target.get("tagName"), str)
            or parse_version(target.get("version")) is None):
        raise ValueError("Check for an update before installing it.")
    try:
        release = _fetch_json(f"{RELEASE_API_URL}/{target['id']}")
    except urllib.error.HTTPError as error:
        if error.code == 404:
            raise RuntimeError("The selected release is no longer available. Check for updates again.") from error
        raise
    eligible = _eligible_releases([release], channel)
    if not eligible or _release_target(eligible[0]) != target:
        raise RuntimeError("The selected release changed. Check for updates again.")
    return _tarball_asset(release)


def _download_build(asset, on_progress=None):
    file_descriptor, archive_path = tempfile.mkstemp(prefix=f"{PACKAGE_NAME}-", suffix=".tar.gz")
    os.close(file_descriptor)
    try:
        request = urllib.request.Request(asset["browser_download_url"], headers={"User-Agent": PACKAGE_NAME})
        with urllib.request.urlopen(request, context=_release_notes_ssl_context(),
                                    timeout=RELEASE_DOWNLOAD_TIMEOUT_SECONDS) as response, open(archive_path, "wb") as output_file:
            length = response.headers.get("Content-Length")
            total = int(length) if length and length.isdecimal() and int(length) > 0 else None
            downloaded, last_notification = 0, 0
            if on_progress:
                on_progress(downloaded, total)
            while chunk := response.read(256 * 1024):
                output_file.write(chunk)
                downloaded += len(chunk)
                now = time.monotonic()
                if on_progress and now - last_notification >= 0.2:
                    on_progress(downloaded, total)
                    last_notification = now
            if total is not None and downloaded != total:
                raise RuntimeError("The update download was incomplete. Try again.")
            if on_progress:
                on_progress(downloaded, total)
        return archive_path
    except BaseException:
        os.remove(archive_path)
        raise


def _stage_build(archive_path, staging_dir, expected_version):
    with tarfile.open(archive_path, "r:gz") as archive:
        members = archive.getmembers()
        for member in members:
            path = PurePosixPath(member.name)
            if (path.is_absolute() or ".." in path.parts or not path.parts
                    or path.parts[0] != PACKAGE_NAME or not (member.isfile() or member.isdir())):
                raise RuntimeError("The downloaded DeckyZone archive contains an invalid entry.")
        archive.extractall(staging_dir, members=members)
    staged_plugin_dir = os.path.join(staging_dir, PACKAGE_NAME)
    if not os.path.isdir(staged_plugin_dir):
        raise RuntimeError("The downloaded release did not contain a top-level plugin directory.")
    try:
        with open(os.path.join(staged_plugin_dir, "package.json"), encoding="utf-8") as handle:
            package = json.load(handle)
    except (OSError, ValueError) as error:
        raise RuntimeError("The downloaded release has no valid package version.") from error
    if not isinstance(package, dict) or package.get("version") != expected_version:
        raise RuntimeError("The downloaded package version does not match the selected release.")
    return staged_plugin_dir


def _update_paths():
    plugin = getattr(decky, "DECKY_PLUGIN_DIR", "")
    plugin = plugin or f"{decky.DECKY_USER_HOME}/homebrew/plugins/{PACKAGE_NAME}"
    return validate_paths(UPDATE_DIRECTORY, plugin)


def _owner_running(state):
    pid = state.get("ownerPid")
    if not isinstance(pid, int) or pid <= 0:
        return False
    try:
        os.kill(pid, 0)
        return True
    except ProcessLookupError:
        return False


def _notify(update_dir, state, on_progress):
    state = write_status(update_dir, state)
    if on_progress:
        on_progress(public_status(state))
    return state


def _require_idle(state):
    if state.get("phase") in BUSY_PHASES and _owner_running(state):
        raise RuntimeError("Wait for the update operation to finish.")


def get_update_status():
    update_dir, _ = _update_paths()
    state = read_status(update_dir)
    if state.get("phase") in BUSY_PHASES and not _owner_running(state):
        with operation_lock(update_dir):
            state = read_status(update_dir)
            if state.get("phase") in BUSY_PHASES and not _owner_running(state):
                state.update(phase="ready" if (update_dir / "pending").exists() else "error",
                             error="The update was interrupted. Try again.")
                state.pop("ownerPid", None)
                state = write_status(update_dir, state)
    return public_status(state)


def discard_update(*, on_progress=None):
    update_dir, _ = _update_paths()
    with operation_lock(update_dir):
        _require_idle(read_status(update_dir))
        remove_tree(update_dir / "pending")
        return public_status(_notify(update_dir, empty_status(), on_progress))


def prepare_update(channel, target, *, get_saved_channel, on_progress=None):
    validate_channel(channel)
    if get_saved_channel() != channel:
        raise RuntimeError("The update channel changed. Check for updates again.")
    update_dir, plugin_dir = _update_paths()
    with operation_lock(update_dir):
        previous = read_status(update_dir)
        _require_idle(previous)
        state = dict(empty_status(), phase="checking", channel=channel,
                     release=target, ownerPid=os.getpid())
        state = _notify(update_dir, state, on_progress)
        archive_path = None
        try:
            asset = _verify_selected_release(channel, target)
            state["phase"] = "downloading"
            state = _notify(update_dir, state, on_progress)

            def download_progress(downloaded, total):
                nonlocal state
                state.update(downloadedBytes=downloaded, totalBytes=total)
                state = _notify(update_dir, state, on_progress)

            archive_path = _download_build(asset, download_progress)
            state["phase"] = "staging"
            state = _notify(update_dir, state, on_progress)
            with tempfile.TemporaryDirectory(prefix="staging-", dir=update_dir) as staging_dir:
                staged = _stage_build(archive_path, staging_dir, target["version"])
                validate_staged_plugin(staged, target["version"])
                if get_saved_channel() != channel:
                    raise RuntimeError("The update channel changed. Check for updates again.")
                if update_dir.stat().st_dev != plugin_dir.parent.stat().st_dev:
                    raise RuntimeError("The update must be staged on the same drive as Decky Loader.")
                backup = update_dir / "backup"
                if backup.exists():
                    recovered = previous.get("installedVersion") or (previous.get("release") or {}).get("version")
                    if not recovered or getattr(decky, "DECKY_PLUGIN_VERSION", None) != recovered:
                        raise RuntimeError(f"A previous update backup needs recovery: {backup}")
                    validate_staged_plugin(plugin_dir, recovered)
                    remove_tree(backup)
                remove_tree(update_dir / "pending")
                os.replace(staged, update_dir / "pending")
            # Use the currently running installer, never code from the downloaded build.
            shutil.copyfile(Path(__file__).with_name("plugin_update_install.py"), update_dir / "install.py")
            state.update(phase="ready", error=None)
            state.pop("ownerPid", None)
            return public_status(_notify(update_dir, state, on_progress))
        except BaseException as error:
            state.update(phase="error", error=str(error) or type(error).__name__)
            state.pop("ownerPid", None)
            _notify(update_dir, state, on_progress)
            raise
        finally:
            if archive_path and os.path.exists(archive_path):
                os.remove(archive_path)


def activate_update(*, get_saved_channel, on_progress=None):
    update_dir, plugin_dir = _update_paths()
    with operation_lock(update_dir):
        state = read_status(update_dir)
        _require_idle(state)
        if state.get("phase") != "ready":
            raise RuntimeError("Download the update before restarting Decky Loader.")
        if get_saved_channel() != state.get("channel"):
            raise RuntimeError("The update channel changed. Check for updates again.")
        try:
            _verify_selected_release(state["channel"], state["release"])
            validate_staged_plugin(update_dir / "pending", state["release"]["version"])
            if not (update_dir / "install.py").is_file():
                raise RuntimeError("The update installer is missing. Download the update again.")
        except Exception as error:
            state.update(phase="error", error=str(error) or type(error).__name__)
            _notify(update_dir, state, on_progress)
            raise
        state.update(phase="restarting", error=None, ownerPid=os.getpid())
        state = _notify(update_dir, state, on_progress)
        try:
            subprocess.run([
                "systemd-run", "--quiet", "--collect", f"--unit={INSTALL_UNIT}",
                "--property=Type=exec", "/usr/bin/python3", str(update_dir / "install.py"),
                str(update_dir), str(plugin_dir),
            ], check=True, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=get_env())
        except BaseException as error:
            state.update(phase="ready", error=str(error) or type(error).__name__)
            state.pop("ownerPid", None)
            _notify(update_dir, state, on_progress)
            raise
        return public_status(state)


def ota_update(channel, target, *, get_saved_channel, on_progress=None):
    prepare_update(channel, target, get_saved_channel=get_saved_channel, on_progress=on_progress)
    activate_update(get_saved_channel=get_saved_channel, on_progress=on_progress)
    return True
