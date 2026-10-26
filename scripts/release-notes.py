#!/usr/bin/env python3
"""Select incremental preview changes and clean public release-note metadata."""

import argparse
import json
from pathlib import Path
import re
import subprocess
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "py_modules"))
from release_versions import parse_version, require_version


PAIR = re.compile(
    r"^\s*(\d+|-):\s+([0-9a-f]{40}|-{40})\s+([=!<>])\s+"
    r"(\d+|-):\s+([0-9a-f]{40}|-{40})(?:\s|$)"
)
PUBLIC_CHANGE = re.compile(r"^(feat|fix|perf)(?:\(([^)]+)\))?!?:\s")


def git(repo, *args, strip=True):
    value = subprocess.check_output(["git", "-C", str(repo), *args], text=True)
    return value.strip() if strip else value


def published_tags(releases):
    # gh api --paginate --slurp returns one list per page.
    return [release["tag_name"] for page in releases for release in page
            if release.get("draft") is False and release.get("published_at")
            and isinstance(release.get("tag_name"), str)
            and release["tag_name"].startswith("v")
            and parse_version(release["tag_name"], allow_tag=True) is not None
            and release.get("prerelease") is (parse_version(release["tag_name"], allow_tag=True)[3] == 0)]


def preview_source(repo, tag):
    commit = git(repo, "rev-parse", tag + "^{commit}")
    parents = git(repo, "rev-list", "--parents", "-n", "1", commit).split()
    files = set(git(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", commit).splitlines())
    # The publisher tags a metadata-only child without advancing the WIP branch.
    if (len(parents) == 2 and files == {"package.json", "CHANGELOG.md"}
            and git(repo, "show", "-s", "--format=%s", commit) == "chore(release): " + tag):
        return parents[1]
    return commit


def edit_payload(repo, commit):
    patch = git(repo, "show", "--format=", "--unified=0", "--no-renames", "--binary",
                "--no-color", "--no-ext-diff", "--no-textconv", commit, strip=False)
    # Keep actual edits, whitespace, file names, modes and binary data. Ignore
    # parent blob IDs and hunk locations/context changed by rebasing.
    return [line for line in patch.splitlines() if not line.startswith(("index ", "@@"))]


def new_commits(repo, old, source):
    base = git(repo, "merge-base", old, source)
    current = git(repo, "rev-list", "--reverse", "--no-merges", base + ".." + source).splitlines()
    if base == old or base == source:
        return base, current, []
    previous = git(repo, "rev-list", "--no-merges", base + ".." + old).splitlines()
    comparison = git(repo, "range-diff", "--no-color", "--no-dual-color", "--abbrev=40",
                     "--no-ext-diff", "--no-textconv", base + ".." + old, base + ".." + source)
    pairs = [match.groups() for line in comparison.splitlines() if (match := PAIR.match(line))]
    old_ids = [old_sha for left, old_sha, _, _, _ in pairs if left != "-"]
    new_ids = [new_sha for _, _, _, right, new_sha in pairs if right != "-"]
    if (len(old_ids) != len(set(old_ids)) or set(old_ids) != set(previous)
            or len(new_ids) != len(set(new_ids)) or set(new_ids) != set(current)):
        raise RuntimeError("Unrecognized git range-diff output; release notes were not generated")
    selected, amended = [], []
    for _, old_sha, status, _, new_sha in pairs:
        if status == ">":
            selected.append(new_sha)
        elif status == "!" and edit_payload(repo, old_sha) != edit_payload(repo, new_sha):
            # A substantive amendment must remain visible, rather than being
            # mistaken for an already-released feature with a new commit ID.
            selected.append(new_sha)
            amended.append(new_sha)
    return base, selected, amended


def internal_path(path):
    return (path.startswith((".github/", "scripts/", "docs/", "licenses/"))
            or path in ("README.md", "CHANGELOG.md", "cliff.toml")
            or "tests" in Path(path).parts or Path(path).name.startswith("test-"))


def public_change(repo, commit):
    subject = git(repo, "show", "-s", "--format=%s", commit)
    match = PUBLIC_CHANGE.match(subject)
    if not match or match[2] in ("ci", "build", "test") or (match[2] or "").startswith("deps"):
        return False
    paths = git(repo, "diff-tree", "--root", "--no-commit-id", "--name-only", "-r", "-z", commit, strip=False).split("\0")
    return not all(internal_path(path) for path in paths if path)


def select_notes(repo, version, source, releases):
    target = require_version(version)
    if target[3] != 0:
        raise ValueError("Incremental notes require a numbered pre-release")
    source = git(repo, "rev-parse", source + "^{commit}")
    tags = published_tags(releases)
    previous = [tag for tag in tags if (parsed := parse_version(tag, allow_tag=True))[:3] == target[:3]
                and parsed[3] == 0 and parsed[4] < target[4]]
    prior = max(previous, key=lambda tag: parse_version(tag, allow_tag=True)) if previous else None
    if prior:
        base, selected, amended = new_commits(repo, preview_source(repo, prior), source)
    else:
        reachable = set(git(repo, "tag", "--merged", source).splitlines())
        stable = [tag for tag in tags if parse_version(tag, allow_tag=True)[3] == 1 and tag in reachable]
        base_tag = git(repo, "describe", "--tags", "--abbrev=0",
                       *("--match=" + tag for tag in stable), source) if stable else None
        base = git(repo, "rev-parse", base_tag + "^{commit}") if base_tag else None
        selected = git(repo, "rev-list", "--reverse", "--no-merges",
                       base + ".." + source if base else source).splitlines()
        amended = []
    included = [commit for commit in selected if public_change(repo, commit)]
    candidates = git(repo, "rev-list", "--reverse", "--no-merges",
                     base + ".." + source if base else source).splitlines()
    return {"previousPreview": prior, "range": base + ".." + source if base else source,
            "included": included, "amended": amended,
            "skipped": [commit for commit in candidates if commit not in included]}


def clean_metadata(text):
    lines = []
    for line in text.splitlines(keepends=True):
        if line.startswith("- "):
            ending = "\n" if line.endswith("\n") else ""
            line = re.sub(r"\s+by @[\w-]+(?:\[bot\])?\s*$", "", line.rstrip("\n"))
            line = re.sub(r"\s*\(#\d+(?:,\s*#\d+)*\)", "", line) + ending
        lines.append(line)
    return "".join(lines)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    select = commands.add_parser("select")
    select.add_argument("--repo", type=Path, default=Path.cwd())
    select.add_argument("--version", required=True)
    select.add_argument("--source", required=True)
    select.add_argument("--releases", type=Path, required=True)
    select.add_argument("--output", type=Path, required=True)
    select.add_argument("--github-output", type=Path)
    select.add_argument("--summary", type=Path)
    clean = commands.add_parser("clean")
    clean.add_argument("path", type=Path)
    args = parser.parse_args()
    if args.command == "clean":
        args.path.write_text(clean_metadata(args.path.read_text(encoding="utf-8")), encoding="utf-8")
        return
    result = select_notes(args.repo, args.version, args.source, json.loads(args.releases.read_text()))
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    if args.github_output:
        with args.github_output.open("a") as output:
            output.write("range=" + result["range"] + "\n")
            output.write("skip_args=" + " ".join("--skip-commit " + sha for sha in result["skipped"]) + "\n")
            output.write(f"count={len(result['included'])}\n")
    if args.summary:
        with args.summary.open("a") as summary:
            summary.write("### Pre-release notes\n\nPrevious preview: " + (result["previousPreview"] or "None (first preview)") + "\n\n")
            summary.write(f"Selected {len(result['included'])} user-facing changes.\n")
            if result["amended"]:
                summary.write("\nRetained amended changes for review:\n")
                for commit in result["amended"]:
                    summary.write("- " + git(args.repo, "show", "-s", "--format=%s", commit) + "\n")
    print(f"Selected {len(result['included'])} pre-release notes")


if __name__ == "__main__":
    main()
