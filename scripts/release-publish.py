#!/usr/bin/env python3
"""Publish a verified release, or resume publication of the same immutable build."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time


RELEASE_READ_ATTEMPTS = 5
RELEASE_READ_DELAY = 2


class ReleaseError(Exception):
    pass


class ReleasePending(ReleaseError):
    pass


def command(*args, binary=False, allow_failure=False, input_data=None):
    result = subprocess.run(args, input=input_data, capture_output=True,
                            text=not binary, check=False)
    if result.returncode and not allow_failure:
        detail = result.stderr.decode(errors="replace") if binary else result.stderr
        raise ReleaseError(f"{args[0]} {args[1]} failed: {detail.strip()}")
    return result


def git(*args):
    return command("git", *args).stdout.strip()


def remote_ref(ref):
    result = command("git", "ls-remote", "--exit-code", "--refs", "origin", ref,
                     allow_failure=True)
    if result.returncode == 2:
        return None
    if result.returncode:
        raise ReleaseError(f"Cannot read remote reference {ref}: {result.stderr.strip()}")
    rows = [line.split() for line in result.stdout.splitlines()]
    if len(rows) != 1 or len(rows[0]) != 2 or rows[0][1] != ref:
        raise ReleaseError(f"Unexpected remote reference response for {ref}")
    return rows[0][0]


def verify_release_commit(release_sha, source_sha, release_dir):
    parents = git("rev-list", "--parents", "-n", "1", release_sha).split()
    if parents != [release_sha, source_sha]:
        raise ReleaseError("Release tag must point to a commit whose sole parent is the built source")
    changed = set(git("diff-tree", "--no-commit-id", "--name-only", "-r", release_sha).splitlines())
    if changed != {"package.json", "CHANGELOG.md"}:
        raise ReleaseError("Release commit must change only package.json and CHANGELOG.md")
    for name in sorted(changed):
        actual = command("git", "show", f"{release_sha}:{name}", binary=True).stdout
        if actual != (release_dir / name).read_bytes():
            raise ReleaseError(f"Existing release tag conflicts with prepared {name}")


def prepare_tag(source_sha, tag, release_dir):
    # Check the tag first: a successful push moves main before later upload jobs fail.
    if remote_ref(f"refs/tags/{tag}"):
        git("fetch", "--no-tags", "origin", f"refs/tags/{tag}:refs/tags/{tag}")
        release_sha = git("rev-parse", f"refs/tags/{tag}^{{commit}}")
        verify_release_commit(release_sha, source_sha, release_dir)
        return release_sha, True

    if remote_ref("refs/heads/main") != source_sha:
        raise ReleaseError("main advanced after preparation; dispatch a new release from current main")
    for name in ("package.json", "CHANGELOG.md"):
        shutil.copyfile(release_dir / name, name)
    git("add", "--", "package.json", "CHANGELOG.md")
    git("-c", "user.name=github-actions[bot]", "-c",
        "user.email=41898282+github-actions[bot]@users.noreply.github.com",
        "-c", "commit.gpgsign=false", "commit", "-m", f"chore(release): {tag}")
    release_sha = git("rev-parse", "HEAD")
    verify_release_commit(release_sha, source_sha, release_dir)
    git("-c", "tag.gpgsign=false", "tag", tag, release_sha)
    # The normal fast-forward push also protects against main advancing after the check.
    git("push", "--atomic", "origin", "HEAD:refs/heads/main", f"refs/tags/{tag}")
    return release_sha, False


def validate_release(release, tag, release_id=None):
    if not isinstance(release, dict):
        raise ReleaseError("GitHub returned invalid release metadata")
    if type(release.get("id")) is not int or release["id"] <= 0:
        raise ReleaseError("GitHub returned an invalid release identity")
    if release.get("tag_name") != tag or (release_id is not None and release["id"] != release_id):
        raise ReleaseError("GitHub release identity conflicts with the planned release")
    if release.get("prerelease") is not False:
        raise ReleaseError("GitHub release stable-release status conflicts")
    if (not isinstance(release.get("draft"), bool)
            or not isinstance(release.get("assets"), list)
            or not all(isinstance(asset, dict) for asset in release["assets"])):
        raise ReleaseError("GitHub returned incomplete release metadata")
    return release


def read_release(repo, tag):
    # Listing includes drafts for the authenticated maintainer; the tag endpoint
    # only documents published releases and cannot reliably resume a draft.
    result = command("gh", "api", "--hostname", "github.com", "--paginate", "--slurp",
                     f"repos/{repo}/releases?per_page=100")
    try:
        pages = json.loads(result.stdout)
        matches = [release for page in pages for release in page if release.get("tag_name") == tag]
    except (ValueError, TypeError, AttributeError) as exc:
        raise ReleaseError("GitHub returned invalid release metadata") from exc
    if not matches:
        return None
    if len(matches) != 1:
        raise ReleaseError("Multiple GitHub releases conflict with the planned tag")
    return validate_release(matches[0], tag)


def read_release_by_id(repo, tag, release_id):
    result = command("gh", "api", "--hostname", "github.com",
                     f"repos/{repo}/releases/{release_id}", allow_failure=True)
    if result.returncode:
        if re.search(r"\bHTTP (?:404|5\d\d)\b", result.stderr):
            raise ReleasePending("GitHub release metadata is not available yet")
        raise ReleaseError(f"Cannot read release {release_id}: {result.stderr.strip()}")
    try:
        release = json.loads(result.stdout)
    except ValueError as exc:
        raise ReleaseError("GitHub returned invalid release metadata") from exc
    return validate_release(release, tag, release_id)


def create_release(repo, tag, release_dir):
    payload = {"tag_name": tag, "name": tag,
               "body": (release_dir / "CHANGES.md").read_text(encoding="utf-8"),
               "draft": True, "prerelease": False}
    # prepare_tag has already verified and pushed the tag. Keep the POST response
    # rather than rediscovering a new draft through a potentially stale list.
    result = command("gh", "api", "--hostname", "github.com", "--method", "POST",
                     f"repos/{repo}/releases", "--input", "-",
                     input_data=json.dumps(payload))
    try:
        release = validate_release(json.loads(result.stdout), tag)
    except ValueError as exc:
        raise ReleaseError("GitHub returned invalid release metadata") from exc
    if not release["draft"]:
        raise ReleaseError("GitHub did not create a draft release")
    return release


def verify_draft_notes(release, tag, release_dir):
    # A published matching release may have manually edited notes; leave them intact.
    if release["draft"]:
        notes = (release_dir / "CHANGES.md").read_text(encoding="utf-8").rstrip()
        if release.get("name") != tag or (release.get("body") or "").rstrip() != notes:
            raise ReleaseError("Existing draft title or notes conflict with the prepared release")


def verify_assets(repo, release, manifest):
    missing = []
    for name in ("DeckyZone.zip", "DeckyZone.tar.gz"):
        matches = [asset for asset in release["assets"] if asset.get("name") == name]
        if not matches:
            missing.append(name)
            continue
        if len(matches) != 1:
            raise ReleaseError(f"Conflicting duplicate release asset: {name}")
        asset = matches[0]
        expected = manifest["files"][name]
        if type(asset.get("id")) is not int or asset["id"] <= 0:
            raise ReleaseError(f"Invalid release asset identity: {name}")
        if asset.get("size") != expected["size"] or asset.get("state") != "uploaded":
            raise ReleaseError(f"Conflicting or incomplete release asset: {name}")
        digest = asset.get("digest")
        if digest and digest != f"sha256:{expected['sha256']}":
            raise ReleaseError(f"Conflicting release asset checksum: {name}")
        downloaded = command("gh", "api", "--hostname", "github.com", "-H",
                             "Accept: application/octet-stream",
                             f"repos/{repo}/releases/assets/{asset['id']}", binary=True).stdout
        if len(downloaded) != expected["size"] or hashlib.sha256(downloaded).hexdigest() != expected["sha256"]:
            raise ReleaseError(f"Downloaded release asset does not match prepared build: {name}")
    return missing


def wait_for_release(repo, tag, release_id, release_dir, manifest, published=False):
    for attempt in range(RELEASE_READ_ATTEMPTS):
        try:
            release = read_release_by_id(repo, tag, release_id)
            verify_draft_notes(release, tag, release_dir)
            missing = verify_assets(repo, release, manifest)
            if not missing and (not published or not release["draft"]):
                return release
        except ReleasePending:
            pass
        if attempt + 1 < RELEASE_READ_ATTEMPTS:
            time.sleep(RELEASE_READ_DELAY)
    if published:
        raise ReleaseError("Published stable release could not be verified after bounded retries")
    raise ReleaseError("Both release assets must be verified before publication after bounded retries")


def publish(repo, tag, release_dir, manifest):
    release = read_release(repo, tag)
    if release is None:
        release = create_release(repo, tag, release_dir)
    release_id = release["id"]
    verify_draft_notes(release, tag, release_dir)

    missing = verify_assets(repo, release, manifest)
    if missing and not release["draft"]:
        raise ReleaseError("Published release is missing prepared assets")
    if not release["draft"]:
        return
    for name in missing:
        content_type = "application/zip" if name.endswith(".zip") else "application/gzip"
        command("gh", "api", "--hostname", "github.com", "--method", "POST",
                "--header", f"Content-Type: {content_type}",
                "--input", str(release_dir / name),
                f"https://uploads.github.com/repos/{repo}/releases/{release_id}/assets?name={name}")
    release = wait_for_release(repo, tag, release_id, release_dir, manifest)
    if release["draft"]:
        command("gh", "api", "--hostname", "github.com", "--method", "PATCH",
                f"repos/{repo}/releases/{release_id}", "--input", "-",
                input_data=json.dumps({"draft": False, "make_latest": "true"}))
        wait_for_release(repo, tag, release_id, release_dir, manifest, published=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release-dir", required=True, type=Path)
    parser.add_argument("--source-sha", required=True)
    parser.add_argument("--version", required=True)
    parser.add_argument("--repo", required=True)
    args = parser.parse_args()
    if not re.fullmatch(r"[0-9a-f]{40}", args.source_sha):
        raise ReleaseError("Expected a full source commit SHA")
    if not re.fullmatch(r"(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", args.version):
        raise ReleaseError("Expected a stable semantic version")
    if not re.fullmatch(r"[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+", args.repo):
        raise ReleaseError("Expected a GitHub owner/repository")
    release_dir = args.release_dir.resolve()
    command(sys.executable, str(Path(__file__).with_name("release-package.py")),
            "--verify", str(release_dir))
    manifest = json.loads((release_dir / "release-manifest.json").read_text(encoding="utf-8"))
    tag = f"v{args.version}"
    if (manifest["source_sha"], manifest["version"], manifest["tag"]) != (args.source_sha, args.version, tag):
        raise ReleaseError("Prepared artifact identity does not match this workflow dispatch")
    if git("rev-parse", "HEAD") != args.source_sha or git("status", "--porcelain"):
        raise ReleaseError("Publication requires a clean checkout of the exact built source commit")
    original = json.loads(command("git", "show", f"{args.source_sha}:package.json").stdout)
    prepared = json.loads((release_dir / "package.json").read_text(encoding="utf-8"))
    original["version"] = args.version
    if original != prepared:
        raise ReleaseError("Prepared package.json must change only the version")
    release_sha, resumed = prepare_tag(args.source_sha, tag, release_dir)
    publish(args.repo, tag, release_dir, manifest)
    url = f"https://github.com/{args.repo}/releases/tag/{tag}"
    print(json.dumps({"tag": tag, "release_sha": release_sha, "release_url": url, "resumed": resumed}))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
            summary.write(f"Released [{tag}]({url}) from `{args.source_sha}`. Both assets were downloaded and verified.\n")


if __name__ == "__main__":
    try:
        main()
    except (ReleaseError, OSError, ValueError, KeyError) as exc:
        print(f"Release stopped: {exc}", file=sys.stderr)
        sys.exit(1)
