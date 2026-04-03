import shlex

import controller_targets


TARGET_SETTLE_TIMEOUT_SECONDS = 3.0
TARGET_SETTLE_POLL_INTERVAL_SECONDS = 0.25
TARGET_APPLY_RETRY_ATTEMPTS = 3
TARGET_APPLY_RETRY_BACKOFF_SECONDS = 0.5


async def retry_detail_until_clear(
    run_attempt,
    sleep,
    attempts=TARGET_APPLY_RETRY_ATTEMPTS,
    backoff=TARGET_APPLY_RETRY_BACKOFF_SECONDS,
):
    last_detail = None

    for attempt in range(attempts):
        last_detail = await run_attempt()
        if last_detail is None:
            return None

        if attempt < attempts - 1:
            await sleep(backoff)

    return last_detail


def parse_busctl_string_output(output):
    text = (output or "").strip()
    if not text:
        return ""

    if " " not in text:
        return text

    _, encoded_value = text.split(" ", 1)
    encoded_value = encoded_value.strip()
    if len(encoded_value) >= 2 and encoded_value[0] == encoded_value[-1] == '"':
        encoded_value = encoded_value[1:-1]

    return bytes(encoded_value, "utf-8").decode("unicode_escape")


def parse_busctl_array_output(output):
    text = (output or "").strip()
    if not text:
        return []

    tokens = shlex.split(text)
    if not tokens or len(tokens) == 1:
        return []

    values = tokens[2:] if tokens[1].isdigit() else tokens[1:]
    return [value for value in values if value.startswith("/")]


async def wait_for_target_devices(
    get_target_device_paths,
    resolve_keyboard_device_path,
    mark_unavailable,
    sleep,
    expected_count,
    require_keyboard_device=True,
    timeout=TARGET_SETTLE_TIMEOUT_SECONDS,
    interval=TARGET_SETTLE_POLL_INTERVAL_SECONDS,
):
    elapsed = 0.0

    while elapsed < timeout:
        try:
            target_paths = get_target_device_paths()
            keyboard_device_path = (
                resolve_keyboard_device_path() if require_keyboard_device else True
            )
            if len(target_paths) >= expected_count and keyboard_device_path:
                return True
        except Exception:
            mark_unavailable()

        await sleep(interval)
        elapsed += interval

    return False


async def apply_target_devices_with_retries(
    apply_target_devices,
    wait_for_target_devices_fn,
    sleep,
    target_mode,
    include_keyboard=True,
    include_mouse=True,
    attempts=TARGET_APPLY_RETRY_ATTEMPTS,
    backoff=TARGET_APPLY_RETRY_BACKOFF_SECONDS,
):
    expected_count = len(
        controller_targets.build_target_devices(
            target_mode,
            include_keyboard=include_keyboard,
            include_mouse=include_mouse,
        )
    )

    for attempt in range(attempts):
        apply_target_devices(
            target_mode,
            include_keyboard=include_keyboard,
            include_mouse=include_mouse,
        )
        if await wait_for_target_devices_fn(
            expected_count,
            require_keyboard_device=include_keyboard,
        ):
            return True

        if attempt < attempts - 1:
            await sleep(backoff)

    return False
