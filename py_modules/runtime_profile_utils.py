def _split_mapping_blocks(profile_yaml):
    lines = profile_yaml.splitlines()
    mapping_header_index = None
    mapping_indent = ""

    for index, line in enumerate(lines):
        if line.strip() == "mapping:":
            mapping_header_index = index
            mapping_indent = line[: len(line) - len(line.lstrip())]
            break

    if mapping_header_index is None:
        return profile_yaml, None, None, []

    prefix_lines = lines[: mapping_header_index + 1]
    suffix_lines = []
    blocks = []
    index = mapping_header_index + 1

    while index < len(lines):
        line = lines[index]
        stripped = line.lstrip()
        indent = line[: len(line) - len(stripped)]

        if (
            stripped
            and not stripped.startswith("#")
            and indent == mapping_indent
            and not stripped.startswith("-")
        ):
            suffix_lines = lines[index:]
            break

        if stripped.startswith("- name:") and indent == mapping_indent:
            block_start = index
            block_indent = indent
            index += 1
            while index < len(lines):
                next_line = lines[index]
                next_stripped = next_line.lstrip()
                next_indent = next_line[: len(next_line) - len(next_stripped)]
                if next_stripped.startswith("- ") and next_indent == block_indent:
                    break
                if (
                    next_stripped
                    and not next_stripped.startswith("#")
                    and next_indent == mapping_indent
                    and not next_stripped.startswith("-")
                ):
                    break
                index += 1

            blocks.append(lines[block_start:index])
            continue

        prefix_lines.append(line)
        index += 1

    return profile_yaml, prefix_lines, suffix_lines, blocks


def _join_mapping_blocks(original_profile_yaml, prefix_lines, suffix_lines, blocks):
    output_lines = list(prefix_lines)
    for block in blocks:
        output_lines.extend(block)
    output_lines.extend(suffix_lines)
    output = "\n".join(output_lines)
    if original_profile_yaml.endswith("\n"):
        output = f"{output}\n"
    return output


def remove_mapping_names(profile_yaml, mapping_names):
    if not profile_yaml or not mapping_names:
        return profile_yaml

    original_profile_yaml, prefix_lines, suffix_lines, blocks = _split_mapping_blocks(
        profile_yaml
    )
    if prefix_lines is None:
        return profile_yaml

    kept_blocks = []
    for block in blocks:
        header = block[0].lstrip()
        block_name = header[len("- name:") :].strip() if header.startswith("- name:") else ""
        if block_name not in mapping_names:
            kept_blocks.append(block)

    return _join_mapping_blocks(
        original_profile_yaml,
        prefix_lines,
        suffix_lines,
        kept_blocks,
    )


def remove_gamepad_button_source_mappings(profile_yaml, button_names):
    if not profile_yaml or not button_names:
        return profile_yaml

    original_profile_yaml, prefix_lines, suffix_lines, blocks = _split_mapping_blocks(
        profile_yaml
    )
    if prefix_lines is None:
        return profile_yaml

    kept_blocks = []
    needle_lines = {f"button: {button_name}" for button_name in button_names}

    for block in blocks:
        block_text = "\n".join(line.strip() for line in block)
        if any(needle in block_text for needle in needle_lines):
            continue
        kept_blocks.append(block)

    return _join_mapping_blocks(
        original_profile_yaml,
        prefix_lines,
        suffix_lines,
        kept_blocks,
    )
