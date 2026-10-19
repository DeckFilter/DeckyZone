import json
import os
from pathlib import PurePosixPath
import shutil
import ssl
import stat
import subprocess
import tarfile
import tempfile
import urllib.error
import urllib.request

import decky
from release_versions import normalize_version, parse_version


PACKAGE_NAME = "DeckyZone"
RELEASE_API_URL = "https://api.github.com/repos/DeckFilter/DeckyZone/releases"
RELEASE_CHECK_TIMEOUT_SECONDS = 5
RELEASE_DOWNLOAD_TIMEOUT_SECONDS = 60
RELEASE_NOTES_LIMIT = 10
TARBALL_ASSET_NAME = f"{PACKAGE_NAME}.tar.gz"
UPDATE_CHANNELS = ("stable", "prerelease")


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


def _download_build(asset):
    file_descriptor, archive_path = tempfile.mkstemp(prefix=f"{PACKAGE_NAME}-", suffix=".tar.gz")
    os.close(file_descriptor)
    try:
        request = urllib.request.Request(asset["browser_download_url"], headers={"User-Agent": PACKAGE_NAME})
        with urllib.request.urlopen(request, context=_release_notes_ssl_context(),
                                    timeout=RELEASE_DOWNLOAD_TIMEOUT_SECONDS) as response, open(archive_path, "wb") as output_file:
            shutil.copyfileobj(response, output_file)
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


def _recursive_chmod(path, perms):
    if not os.path.exists(path):
        return
    for dirpath, _, filenames in os.walk(path):
        current_dir_perms = os.stat(dirpath).st_mode
        os.chmod(dirpath, current_dir_perms | perms)
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            current_file_perms = os.stat(file_path).st_mode
            os.chmod(file_path, current_file_perms | perms)


def ota_update(channel, target, *, get_saved_channel):
    validate_channel(channel)
    if get_saved_channel() != channel:
        raise RuntimeError("The update channel changed. Check for updates again.")
    asset = _verify_selected_release(channel, target)
    archive_path = _download_build(asset)
    plugins_dir = f"{decky.DECKY_USER_HOME}/homebrew/plugins"
    plugin_dir = f"{plugins_dir}/{PACKAGE_NAME}"
    backup_dir = f"{plugins_dir}/.{PACKAGE_NAME}.backup"
    try:
        with tempfile.TemporaryDirectory(prefix=f"{PACKAGE_NAME}-staging-") as staging_dir:
            staged_plugin_dir = _stage_build(archive_path, staging_dir, target["version"])
            if get_saved_channel() != channel:
                raise RuntimeError("The update channel changed. Check for updates again.")
            os.makedirs(plugins_dir, exist_ok=True)
            if os.path.exists(backup_dir):
                _recursive_chmod(backup_dir, stat.S_IWUSR)
                shutil.rmtree(backup_dir)
            if os.path.exists(plugin_dir):
                _recursive_chmod(plugin_dir, stat.S_IWUSR)
                os.replace(plugin_dir, backup_dir)
            try:
                shutil.copytree(staged_plugin_dir, plugin_dir)
            except Exception:
                if os.path.exists(plugin_dir):
                    _recursive_chmod(plugin_dir, stat.S_IWUSR)
                    shutil.rmtree(plugin_dir)
                if os.path.exists(backup_dir):
                    os.replace(backup_dir, plugin_dir)
                raise
            if os.path.exists(backup_dir):
                _recursive_chmod(backup_dir, stat.S_IWUSR)
                shutil.rmtree(backup_dir)
        subprocess.run(
            ["systemctl", "restart", "plugin_loader.service"], check=True, text=True,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=get_env(),
        )
        return True
    finally:
        if os.path.exists(archive_path):
            os.remove(archive_path)
