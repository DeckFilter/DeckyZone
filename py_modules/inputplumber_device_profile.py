import re


DECKYZONE_MANAGED_MARKER = "Managed by DeckyZone: Zotac IMU mount matrix fix"
ZOTAC_IMU_NAME = "{i2c-BMI0160:00,bmi260}"
ZOTAC_IMU_MOUNT_MATRIX = {
    "x": [0, -1, 0],
    "y": [-1, 0, 0],
    "z": [0, 0, -1],
}
ZOTAC_IMU_MOUNT_MATRIX_082 = {
    "x": [0, -1, 0],
    "y": [0, 0, 1],
    "z": [-1, 0, 0],
}
_KNOWN_MOUNT_MATRICES = (ZOTAC_IMU_MOUNT_MATRIX, ZOTAC_IMU_MOUNT_MATRIX_082)

_MATRIX_KEYS = ("x", "y", "z")
_GROUP_RE = re.compile(r"^(?P<indent>\s*)-\s+group:\s*(?P<group>[^\s#]+)")
_NAME_RE = re.compile(r"^\s*name:\s*(?P<name>.+?)\s*(?:#.*)?$")
_ROW_RE = re.compile(r"^\s*(?P<key>[xyz]):\s*\[(?P<values>[^\]]*)\]\s*(?:#.*)?$")


def is_deckyzone_managed_profile(profile_yaml):
    return DECKYZONE_MANAGED_MARKER in (profile_yaml or "")


def has_desired_mount_matrix(profile_yaml):
    lines = _split_lines(profile_yaml)
    imu_block = _find_zotac_imu_block(lines)
    if imu_block is None:
        return False

    matrix = _find_mount_matrix(lines, imu_block["start"], imu_block["end"])
    if matrix is None:
        return False

    return matrix["rows"] in _KNOWN_MOUNT_MATRICES


def build_managed_mount_matrix_profile(profile_yaml):
    lines = _split_lines(profile_yaml)
    trailing_newline = (profile_yaml or "").endswith("\n")
    imu_block = _find_zotac_imu_block(lines)
    if imu_block is None:
        raise ValueError("Zotac Zone bmi260 IMU source device was not found.")

    matrix = _find_mount_matrix(lines, imu_block["start"], imu_block["end"])
    if matrix is not None and matrix["rows"] in _KNOWN_MOUNT_MATRICES:
        raise ValueError("InputPlumber already includes the Zotac Zone IMU orientation fix.")
    if matrix is None:
        matrix_indent = _line_indent(lines[imu_block["name_index"]])
        insert_index = imu_block["name_index"] + 1
        lines = (
            lines[:insert_index]
            + _build_mount_matrix_lines(matrix_indent)
            + lines[insert_index:]
        )
    else:
        lines = (
            lines[: matrix["start"]]
            + _build_mount_matrix_lines(matrix["indent"])
            + lines[matrix["end"] :]
        )

    if not is_deckyzone_managed_profile("\n".join(lines)):
        marker_line = f"# {DECKYZONE_MANAGED_MARKER}"
        insert_index = (
            1
            if lines and lines[0].strip().startswith("# yaml-language-server:")
            else 0
        )
        lines = lines[:insert_index] + [marker_line] + lines[insert_index:]

    output = "\n".join(lines)
    if trailing_newline or not output.endswith("\n"):
        output = f"{output}\n"
    return output


def _split_lines(profile_yaml):
    return (profile_yaml or "").splitlines()


def _line_indent(line):
    return len(line) - len(line.lstrip(" "))


def _normalize_scalar(value):
    normalized = (value or "").strip()
    if normalized and normalized[0] in ("'", '"') and normalized[-1:] == normalized[0]:
        normalized = normalized[1:-1]
    return normalized.strip()


def _normalize_group(value):
    return _normalize_scalar(value).lower()


def _parse_matrix_values(value):
    values = []
    for raw_value in value.split(","):
        raw_value = raw_value.strip()
        if not raw_value:
            continue
        values.append(int(raw_value))
    return values


def _find_zotac_imu_block(lines):
    for index, line in enumerate(lines):
        match = _GROUP_RE.match(line)
        if match is None or _normalize_group(match.group("group")) != "imu":
            continue

        group_indent = len(match.group("indent"))
        block_end = _find_group_block_end(lines, index, group_indent)
        iio = _find_child_mapping(lines, index + 1, block_end, "iio", group_indent + 2)
        if iio is None:
            continue
        name_index = _find_zotac_imu_name_index(
            lines, iio["start"] + 1, iio["end"], iio["indent"] + 2
        )
        if name_index is None:
            continue

        return {
            "start": index,
            "end": block_end,
            "indent": group_indent,
            "name_index": name_index,
        }

    return None


def _find_group_block_end(lines, start_index, group_indent):
    for index in range(start_index + 1, len(lines)):
        stripped = lines[index].strip()
        if not stripped:
            continue

        indent = _line_indent(lines[index])
        if indent < group_indent:
            return index
        if indent == group_indent and stripped.startswith("- group:"):
            return index

    return len(lines)


def _find_zotac_imu_name_index(lines, start_index, end_index, indent):
    for index in range(start_index, end_index):
        if _line_indent(lines[index]) != indent:
            continue
        match = _NAME_RE.match(lines[index])
        if match is None:
            continue

        if _normalize_scalar(match.group("name")) == ZOTAC_IMU_NAME:
            return index

    return None


def _find_mount_matrix(lines, start_index, end_index):
    source_indent = _line_indent(lines[start_index]) + 2
    # InputPlumber uses config.imu first and falls back to deprecated iio config.
    for path in (("config", "imu", "mount_matrix"), ("iio", "mount_matrix")):
        start, end, indent = start_index + 1, end_index, source_indent
        mapping = None
        for key in path:
            mapping = _find_child_mapping(lines, start, end, key, indent)
            if mapping is None:
                break
            start, end, indent = mapping["start"] + 1, mapping["end"], indent + 2
        if mapping is None:
            continue

        rows = {}
        for row_index in range(mapping["start"] + 1, mapping["end"]):
            if _line_indent(lines[row_index]) != mapping["indent"] + 2:
                continue
            match = _ROW_RE.match(lines[row_index])
            if match is None:
                continue
            rows[match.group("key")] = _parse_matrix_values(match.group("values"))

        rows = {key: rows[key] for key in _MATRIX_KEYS if key in rows}
        return {
            **mapping,
            "rows": rows,
        }

    return None


def _find_child_mapping(lines, start_index, end_index, key, indent):
    for index in range(start_index, end_index):
        if _line_indent(lines[index]) != indent:
            continue
        if lines[index].split("#", 1)[0].strip() != f"{key}:":
            continue
        return {
            "start": index,
            "end": _find_mapping_block_end(lines, index, end_index, indent),
            "indent": indent,
        }
    return None


def _find_mapping_block_end(lines, start_index, end_index, mapping_indent):
    for index in range(start_index + 1, end_index):
        stripped = lines[index].strip()
        if not stripped or stripped.startswith("#"):
            continue

        if _line_indent(lines[index]) <= mapping_indent:
            return index

    return end_index


def _format_matrix_row(values):
    return f"[{', '.join(str(value) for value in values)}]"


def _build_mount_matrix_lines(indent):
    prefix = " " * indent
    row_prefix = " " * (indent + 2)
    return [
        f"{prefix}mount_matrix:",
        f"{row_prefix}x: {_format_matrix_row(ZOTAC_IMU_MOUNT_MATRIX['x'])}",
        f"{row_prefix}y: {_format_matrix_row(ZOTAC_IMU_MOUNT_MATRIX['y'])}",
        f"{row_prefix}z: {_format_matrix_row(ZOTAC_IMU_MOUNT_MATRIX['z'])}",
    ]
