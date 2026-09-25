def parse_value(content, key):
    for raw_line in str(content or "").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        candidate_key, value = line.split("=", 1)
        if candidate_key != key:
            continue

        value = value.strip()
        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in {'"', "'"}
        ):
            value = value[1:-1]
        return value or None

    return None


def read_value(read_text, key, candidate_paths):
    for candidate_path in candidate_paths:
        try:
            content = read_text(candidate_path)
        except Exception:
            continue

        value = parse_value(content, key)
        if value is not None:
            return value

    return None


def is_steamos(read_text, candidate_paths):
    return read_value(read_text, "ID", candidate_paths) == "steamos"
