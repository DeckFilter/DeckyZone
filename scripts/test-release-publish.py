#!/usr/bin/env python3
"""Regression checks for release publication; no network or remote writes."""

from copy import deepcopy
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch


SPEC = importlib.util.spec_from_file_location(
    "release_publish", Path(__file__).with_name("release-publish.py"))
publisher = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(publisher)

REPO = "DeckFilter/DeckyZone"
TAG = "v0.6.1"
FILES = ("DeckyZone.zip", "DeckyZone.tar.gz")
NOTES = "## Fixes\n\n- Bundle the controller mapping dependency.\n"


class FakeGitHub:
    """Exercise the real publication logic through the gh command boundary."""

    def __init__(self, directory, manifest, release=None):
        self.directory = directory
        self.manifest = manifest
        self.release = deepcopy(release)
        self.calls = []
        self.create_reads = 0
        self.asset_reads = 0
        self.publish_reads = 0
        self.read_errors = []
        self.hidden_asset_reads = 0
        self.hidden_publication_reads = 0
        self.created_id_override = None
        self.get_override = None
        self.corrupt_downloads = False

    def metadata(self, *, draft=True, assets=False):
        return {"id": 101, "tag_name": TAG, "name": TAG, "body": NOTES,
                "draft": draft, "prerelease": False,
                "assets": self.assets() if assets else []}

    def assets(self):
        return [{"id": 201 + index, "name": name, "state": "uploaded",
                 "size": self.manifest["files"][name]["size"],
                 "digest": "sha256:" + self.manifest["files"][name]["sha256"]}
                for index, name in enumerate(FILES)]

    def _result(self, args, value="", *, binary=False, error=None, allow_failure=False):
        if error:
            stderr = f"gh: API error (HTTP {error})"
            if not allow_failure:
                raise publisher.ReleaseError(stderr)
            return subprocess.CompletedProcess(args, 1, b"" if binary else "", stderr)
        if not isinstance(value, (str, bytes)):
            value = json.dumps(value)
        if binary and isinstance(value, str):
            value = value.encode()
        return subprocess.CompletedProcess(args, 0, value, b"" if binary else "")

    def __call__(self, *args, binary=False, allow_failure=False, input_data=None):
        self.calls.append(args)
        if args[0] != "gh":
            raise AssertionError(f"Unexpected external command: {args}")
        if args[1] == "release":
            operation = args[2]
            if operation == "upload":
                name = next(Path(arg).name for arg in args if Path(arg).name in FILES)
                if any(asset["name"] == name for asset in self.release["assets"]):
                    raise AssertionError("An existing verified asset was uploaded again")
                self.release["assets"].extend(
                    asset for asset in self.assets() if asset["name"] == name)
                return self._result(args)
            if operation == "edit":
                self.release["draft"] = False
                return self._result(args)
            # The old implementation's create/list race must fail the regression.
            if operation == "create":
                self.release = self.metadata()
                return self._result(args, "https://github.com/DeckFilter/DeckyZone/releases/tag/v0.6.1")
            raise AssertionError(f"Unexpected release command: {args}")

        endpoint = next((arg for arg in args if arg.startswith(f"repos/{REPO}/")
                         or arg.startswith(f"https://uploads.github.com/repos/{REPO}/")), None)
        if endpoint is None:
            raise AssertionError(f"No GitHub endpoint in command: {args}")
        method = "GET"
        for flag in ("--method", "-X"):
            if flag in args:
                method = args[args.index(flag) + 1]
        if endpoint.startswith(f"https://uploads.github.com/repos/{REPO}/releases/"):
            self.assert_upload(args, endpoint)
            name = endpoint.split("?name=", 1)[1]
            self.release["assets"].extend(
                asset for asset in self.assets() if asset["name"] == name)
            return self._result(args, self.release["assets"][-1])
        if endpoint == f"repos/{REPO}/releases" and method == "POST":
            data = json.loads(input_data)
            assert data == {"tag_name": TAG, "name": TAG, "body": NOTES,
                            "draft": True, "prerelease": False}, data
            self.release = self.metadata()
            created = deepcopy(self.release)
            if self.created_id_override is not None:
                created["id"] = self.created_id_override
            return self._result(args, created)
        if endpoint.startswith(f"repos/{REPO}/releases?"):
            # Deliberately stale forever after creation: only initial discovery is safe.
            value = [[]] if self.release is None or self.mutations("create") else [[self.release]]
            return self._result(args, value)
        if endpoint == f"repos/{REPO}/releases/101" and method == "PATCH":
            assert json.loads(input_data) == {"draft": False, "make_latest": "true"}
            self.release["draft"] = False
            return self._result(args, self.release)
        if endpoint.startswith(f"repos/{REPO}/releases/assets/"):
            asset_id = int(endpoint.rsplit("/", 1)[1])
            asset = next(asset for asset in self.release["assets"] if asset["id"] == asset_id)
            data = (self.directory / asset["name"]).read_bytes()
            if self.corrupt_downloads:
                data = b"corrupt" + data
            return self._result(args, data, binary=binary)
        if endpoint == f"repos/{REPO}/releases/101":
            self.create_reads += 1
            if self.read_errors:
                error = self.read_errors.pop(0)
                if error:
                    return self._result(args, error=error, allow_failure=allow_failure)
            visible = deepcopy(self.release)
            if len(visible["assets"]) == 2:
                self.asset_reads += 1
                if self.asset_reads <= self.hidden_asset_reads:
                    visible["assets"] = visible["assets"][:1]
            if not visible["draft"]:
                self.publish_reads += 1
                if self.publish_reads <= self.hidden_publication_reads:
                    visible["draft"] = True
            if self.get_override:
                visible.update(self.get_override)
            return self._result(args, visible)
        raise AssertionError(f"Unexpected GitHub API command: {args}")

    def assert_upload(self, args, endpoint):
        assert endpoint.startswith(f"https://uploads.github.com/repos/{REPO}/releases/101/assets?name=")
        name = endpoint.split("?name=", 1)[1]
        assert name in FILES
        assert str(self.directory / name) == args[args.index("--input") + 1]
        assert not any(asset["name"] == name for asset in self.release["assets"]), \
            "An existing verified asset was uploaded again"

    def mutations(self, kind=None):
        operations = []
        for call in self.calls:
            if call[1:3] == ("release", "upload"):
                operations.append("upload")
            elif call[1:3] == ("release", "edit"):
                operations.append("publish")
            elif call[1:3] == ("release", "create"):
                operations.append("create")
            elif call[1] == "api":
                for flag in ("--method", "-X"):
                    if flag in call:
                        method = call[call.index(flag) + 1]
                        if method == "POST":
                            if any(arg.startswith("https://uploads.github.com/") for arg in call):
                                operations.append("upload")
                            else:
                                operations.append("create")
                        elif method == "PATCH":
                            operations.append("publish")
        return [operation for operation in operations if kind is None or operation == kind]

    def listings(self):
        return [call for call in self.calls
                if any(arg.startswith(f"repos/{REPO}/releases?") for arg in call)]


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        self.manifest = {"files": {}}
        for name in FILES:
            data = f"immutable fixture bytes: {name}\n".encode()
            (self.directory / name).write_bytes(data)
            self.manifest["files"][name] = {
                "size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        (self.directory / "CHANGES.md").write_text(NOTES, encoding="utf-8")

    def fake(self, *, draft=None, assets=False):
        result = FakeGitHub(self.directory, self.manifest)
        if draft is not None:
            result.release = result.metadata(draft=draft, assets=assets)
        return result

    def run_publication(self, fake):
        with patch.object(publisher, "command", fake), patch("time.sleep"):
            publisher.publish(REPO, TAG, self.directory, self.manifest)

    def test_created_draft_uses_returned_id_when_release_list_is_stale(self):
        fake = self.fake()
        fake.read_errors = [404, 502, None]
        self.run_publication(fake)
        self.assertEqual(len(fake.listings()), 1)
        self.assertEqual(fake.mutations("create"), ["create"])
        self.assertEqual(fake.mutations("upload"), ["upload", "upload"])
        self.assertFalse(fake.release["draft"])
        self.assertGreaterEqual(fake.create_reads, 3)

    def test_uploaded_assets_and_published_state_can_be_temporarily_stale(self):
        fake = self.fake(draft=True)
        fake.hidden_asset_reads = 2
        fake.hidden_publication_reads = 2
        self.run_publication(fake)
        self.assertGreaterEqual(fake.asset_reads, 3)
        self.assertGreaterEqual(fake.publish_reads, 3)
        self.assertEqual(fake.mutations("publish"), ["publish"])

    def test_matching_draft_resumes_without_creating_or_reuploading(self):
        fake = self.fake(draft=True, assets=True)
        self.run_publication(fake)
        self.assertEqual(fake.mutations(), ["publish"])
        self.assertFalse(fake.release["draft"])

    def test_partial_draft_uploads_only_missing_archive(self):
        fake = self.fake(draft=True, assets=True)
        fake.release["assets"] = fake.release["assets"][:1]
        self.run_publication(fake)
        self.assertEqual(fake.mutations(), ["upload", "publish"])

    def test_matching_published_release_keeps_edited_notes_and_has_no_mutations(self):
        fake = self.fake(draft=False, assets=True)
        fake.release["name"] = "Manually edited title"
        fake.release["body"] = "Manually edited release notes."
        self.run_publication(fake)
        self.assertEqual(fake.mutations(), [])
        self.assertEqual(fake.release["body"], "Manually edited release notes.")

    def test_conflicting_existing_draft_notes_are_rejected_before_upload(self):
        fake = self.fake(draft=True)
        fake.release["body"] = "Different notes"
        with self.assertRaises(publisher.ReleaseError):
            self.run_publication(fake)
        self.assertEqual(fake.mutations(), [])

    def test_conflicting_asset_digest_and_download_are_rejected(self):
        for corruption in ("digest", "download"):
            with self.subTest(corruption=corruption):
                fake = self.fake(draft=True, assets=True)
                if corruption == "digest":
                    fake.release["assets"][0]["digest"] = "sha256:" + "0" * 64
                else:
                    fake.corrupt_downloads = True
                with self.assertRaises(publisher.ReleaseError):
                    self.run_publication(fake)
                self.assertEqual(fake.mutations(), [])

    def test_conflicting_release_identity_or_tag_is_rejected(self):
        for metadata in ({"id": 102}, {"tag_name": "v9.9.9"}):
            with self.subTest(metadata=metadata):
                fake = self.fake(draft=True)
                fake.get_override = metadata
                with self.assertRaises(publisher.ReleaseError):
                    self.run_publication(fake)
                self.assertNotIn("publish", fake.mutations())

    def test_invalid_created_release_id_is_rejected(self):
        for identity in (0, -1, "101", True):
            with self.subTest(identity=identity):
                fake = self.fake()
                fake.created_id_override = identity
                with self.assertRaises(publisher.ReleaseError):
                    self.run_publication(fake)
                self.assertNotIn("upload", fake.mutations())
                self.assertNotIn("publish", fake.mutations())

    def test_unseen_created_release_exhausts_bounded_reads_without_publish(self):
        fake = self.fake()
        fake.read_errors = [404] * 100
        with self.assertRaises(publisher.ReleaseError):
            self.run_publication(fake)
        self.assertGreater(fake.create_reads, 1)
        self.assertLess(fake.create_reads, 100)
        self.assertNotIn("publish", fake.mutations())

    def test_missing_uploaded_asset_exhausts_bounded_reads_without_publish(self):
        fake = self.fake(draft=True)
        fake.hidden_asset_reads = 100
        with self.assertRaises(publisher.ReleaseError):
            self.run_publication(fake)
        self.assertGreater(fake.asset_reads, 1)
        self.assertLess(fake.asset_reads, 100)
        self.assertEqual(fake.mutations(), ["upload", "upload"])

    def test_permission_errors_fail_immediately_without_publish(self):
        fake = self.fake(draft=True)
        fake.read_errors = [403]
        with self.assertRaises(publisher.ReleaseError):
            self.run_publication(fake)
        self.assertEqual(fake.create_reads, 1)
        self.assertNotIn("publish", fake.mutations())

    def test_stale_published_state_exhausts_bounded_reads_without_second_mutation(self):
        fake = self.fake(draft=True, assets=True)
        fake.hidden_publication_reads = 100
        with self.assertRaises(publisher.ReleaseError):
            self.run_publication(fake)
        self.assertGreater(fake.publish_reads, 1)
        self.assertLess(fake.publish_reads, 100)
        self.assertEqual(fake.mutations(), ["publish"])


if __name__ == "__main__":
    unittest.main(verbosity=2)
