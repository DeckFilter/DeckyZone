"""The release version format shared by the updater and publication tools."""

import re


_VERSION = re.compile(r"(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-pre\.([1-9][0-9]*))?\Z")


def parse_version(value, *, allow_tag=False):
    """Return a sortable version tuple, or None for unsupported versions."""
    if not isinstance(value, str):
        return None
    if allow_tag and value.startswith("v"):
        value = value[1:]
    match = _VERSION.fullmatch(value)
    if match is None:
        return None
    major, minor, patch, counter = match.groups()
    return (int(major), int(minor), int(patch), int(counter is None), int(counter or 0))


def require_version(value, *, allow_tag=False):
    version = parse_version(value, allow_tag=allow_tag)
    if version is None:
        raise ValueError("Expected X.Y.Z or X.Y.Z-pre.N with a positive prerelease counter.")
    return version


def normalize_version(value, *, allow_tag=False):
    require_version(value, allow_tag=allow_tag)
    return value[1:] if allow_tag and value.startswith("v") else value


def is_prerelease_version(value, *, allow_tag=False):
    return require_version(value, allow_tag=allow_tag)[3] == 0
