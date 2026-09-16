import asyncio
import json
import math
import os
import subprocess
import time
from pathlib import Path


UPOWER_SERVICE = "org.freedesktop.UPower"
UPOWER_DISPLAY_DEVICE_PATH = "/org/freedesktop/UPower/devices/DisplayDevice"
UPOWER_DEVICE_INTERFACE = "org.freedesktop.UPower.Device"
UPOWER_TIME_TO_EMPTY_PROPERTY = "TimeToEmpty"
UPOWER_TIME_TO_FULL_PROPERTY = "TimeToFull"
VPOWER_TIME_TO_EMPTY_FILENAME = "secs_until_shutdown_request"
VPOWER_TIME_TO_FULL_FILENAME = "secs_until_battery_full"
# Keep the original name for callers that refer to the discharge target.
VPOWER_REMAINING_TIME_FILENAME = VPOWER_TIME_TO_EMPTY_FILENAME
OWNERSHIP_VERSION = 1

RECONCILE_WAITING = "waiting"
RECONCILE_BRIDGED = "bridged"
RECONCILE_NATIVE = "native"

DEFAULT_POLL_INTERVAL_SECONDS = 0.2
DEFAULT_REFRESH_INTERVAL_SECONDS = 5.0
NATIVE_TIME_RATIO_MIN = 0.2
NATIVE_TIME_RATIO_MAX = 5.0
NATIVE_CONFIRMATION_UPDATES = 2


def parse_busctl_int64(output):
    parts = str(output or "").strip().split()
    if len(parts) != 2 or parts[0] != "x":
        raise ValueError(f"Unexpected busctl int64 output: {output!r}")

    return int(parts[1])


class RemainingBatteryTimeBridge:
    def __init__(
        self,
        command_runner=subprocess.run,
        vpower_directory="/run/vpower",
        ownership_path=None,
        command_env=None,
        clock=time.time,
        native_file_fresh_seconds=3.0,
        command_timeout_seconds=2.0,
        _upower_property=UPOWER_TIME_TO_EMPTY_PROPERTY,
        _target_filename=VPOWER_TIME_TO_EMPTY_FILENAME,
        _include_charging_target=True,
    ):
        self.command_runner = command_runner
        self.vpower_directory = Path(vpower_directory)
        self.upower_property = _upower_property
        self.target_path = self.vpower_directory / _target_filename
        self.temp_path = (
            self.vpower_directory
            / f".deckyzone-{_target_filename}"
        )
        self.ownership_path = Path(ownership_path) if ownership_path else None
        self.command_env = command_env
        self.ownership_temp_path = (
            self.ownership_path.with_name(f".{self.ownership_path.name}.tmp")
            if self.ownership_path
            else None
        )
        self.clock = clock
        self.native_file_fresh_seconds = float(native_file_fresh_seconds)
        self.command_timeout_seconds = float(command_timeout_seconds)
        self._owned_fingerprint = self._load_owned_fingerprint()
        self._foreign_candidate_fingerprint = None
        self._foreign_candidate_updates = 0
        self._time_to_empty_native_confirmed = False
        self._time_to_full_native_confirmed = False
        self._charging_bridge = None
        if _include_charging_target:
            charging_ownership_path = self._charging_ownership_path(
                self.ownership_path
            )
            self._charging_bridge = RemainingBatteryTimeBridge(
                command_runner=command_runner,
                vpower_directory=vpower_directory,
                ownership_path=charging_ownership_path,
                command_env=command_env,
                clock=clock,
                native_file_fresh_seconds=native_file_fresh_seconds,
                command_timeout_seconds=command_timeout_seconds,
                _upower_property=UPOWER_TIME_TO_FULL_PROPERTY,
                _target_filename=VPOWER_TIME_TO_FULL_FILENAME,
                _include_charging_target=False,
            )

    def read_time_to_empty(self):
        return self._read_upower_time(self.upower_property)

    def read_time_to_full(self):
        if self._charging_bridge is None:
            return 0

        return self._charging_bridge.read_time_to_empty()

    def _read_upower_time(self, property_name):
        command = [
            "busctl",
            "--system",
            "get-property",
            UPOWER_SERVICE,
            UPOWER_DISPLAY_DEVICE_PATH,
            UPOWER_DEVICE_INTERFACE,
            property_name,
        ]
        run_options = {
            "check": True,
            "text": True,
            "stdout": subprocess.PIPE,
            "stderr": subprocess.PIPE,
            "timeout": self.command_timeout_seconds,
        }
        if self.command_env is not None:
            run_options["env"] = self.command_env

        result = self.command_runner(
            command,
            **run_options,
        )
        return max(0, parse_busctl_int64(result.stdout))

    def reconcile(self, time_to_empty_seconds, time_to_full_seconds=0):
        time_to_empty_outcome = self._reconcile_single(
            time_to_empty_seconds
        )
        if self._charging_bridge is None:
            return time_to_empty_outcome

        time_to_full_outcome = self._charging_bridge._reconcile_single(
            time_to_full_seconds
        )
        self._time_to_empty_native_confirmed = (
            self._update_native_confirmation(
                self._time_to_empty_native_confirmed,
                time_to_empty_outcome,
            )
        )
        self._time_to_full_native_confirmed = (
            self._update_native_confirmation(
                self._time_to_full_native_confirmed,
                time_to_full_outcome,
            )
        )

        changed = bool(
            time_to_empty_outcome["changed"]
            or time_to_full_outcome["changed"]
        )
        if (
            self._time_to_empty_native_confirmed
            and self._time_to_full_native_confirmed
        ):
            return {
                "state": RECONCILE_NATIVE,
                "changed": changed,
            }

        if (
            time_to_empty_outcome["state"] == RECONCILE_BRIDGED
            or time_to_full_outcome["state"] == RECONCILE_BRIDGED
        ):
            return {
                "state": RECONCILE_BRIDGED,
                "changed": changed,
            }

        return {
            "state": RECONCILE_WAITING,
            "changed": changed,
        }

    def _reconcile_single(self, remaining_time_seconds):
        expected_seconds = max(0, int(remaining_time_seconds or 0))
        current_fingerprint = self._fingerprint(self.target_path)
        owned = self._fingerprints_match(
            current_fingerprint,
            self._owned_fingerprint,
        )

        if not owned and self._owned_fingerprint is not None:
            self._forget_ownership()

        if expected_seconds <= 0:
            self._reset_foreign_candidate()
            changed = self._remove_owned_target(current_fingerprint)
            return {
                "state": RECONCILE_WAITING,
                "changed": changed,
            }

        current_value = self._read_positive_finite_value(self.target_path)
        if (
            not owned
            and current_value is not None
            and self._is_fresh(current_fingerprint)
            and self._matches_expected_time(
                current_value,
                expected_seconds,
            )
        ):
            self._forget_ownership()
            if self._foreign_candidate_fingerprint is None:
                self._foreign_candidate_fingerprint = current_fingerprint
                self._foreign_candidate_updates = 0
            elif not self._fingerprints_match(
                current_fingerprint,
                self._foreign_candidate_fingerprint,
            ):
                self._foreign_candidate_fingerprint = current_fingerprint
                self._foreign_candidate_updates += 1

            if self._foreign_candidate_updates < NATIVE_CONFIRMATION_UPDATES:
                return {
                    "state": RECONCILE_WAITING,
                    "changed": False,
                }

            self._reset_foreign_candidate()
            return {
                "state": RECONCILE_NATIVE,
                "changed": False,
            }

        if owned and current_value == float(expected_seconds):
            self._reset_foreign_candidate()
            return {
                "state": RECONCILE_BRIDGED,
                "changed": False,
            }

        self._reset_foreign_candidate()
        self._write_owned_value(expected_seconds)
        return {
            "state": RECONCILE_BRIDGED,
            "changed": True,
        }

    def cleanup(self):
        changed = self._cleanup_single()
        if self._charging_bridge is not None:
            charging_changed = self._charging_bridge._cleanup_single()
            changed = bool(charging_changed or changed)

        self._time_to_empty_native_confirmed = False
        self._time_to_full_native_confirmed = False
        return changed

    def _cleanup_single(self):
        changed = self._remove_owned_target(self._fingerprint(self.target_path))

        if self.temp_path.exists():
            self.temp_path.unlink()
            changed = True

        if self.ownership_temp_path and self.ownership_temp_path.exists():
            self.ownership_temp_path.unlink()
            changed = True

        if self.ownership_path and self.ownership_path.exists():
            self.ownership_path.unlink()
            changed = True

        self._owned_fingerprint = None
        self._reset_foreign_candidate()
        return changed

    @staticmethod
    def _charging_ownership_path(ownership_path):
        if ownership_path is None:
            return None

        return ownership_path.with_name(
            f"{ownership_path.stem}-charging{ownership_path.suffix}"
        )

    @staticmethod
    def _update_native_confirmation(confirmed, outcome):
        if outcome["state"] == RECONCILE_NATIVE:
            return True
        if outcome["state"] == RECONCILE_BRIDGED:
            return False
        return confirmed

    def _reset_foreign_candidate(self):
        self._foreign_candidate_fingerprint = None
        self._foreign_candidate_updates = 0

    def _load_owned_fingerprint(self):
        if not self.ownership_path or not self.ownership_path.is_file():
            return None

        try:
            data = json.loads(self.ownership_path.read_text(encoding="utf-8"))
        except (OSError, ValueError, TypeError):
            return None

        if (
            not isinstance(data, dict)
            or data.get("version") != OWNERSHIP_VERSION
            or data.get("target") != str(self.target_path)
        ):
            return None

        fingerprint = data.get("fingerprint")
        if not isinstance(fingerprint, dict):
            return None

        required_keys = {"device", "inode", "mtimeNs", "size"}
        if not required_keys.issubset(fingerprint):
            return None

        try:
            return {
                key: int(fingerprint[key])
                for key in required_keys
            }
        except (ValueError, TypeError, OverflowError):
            return None

    def _save_owned_fingerprint(self):
        if not self.ownership_path or self._owned_fingerprint is None:
            return

        self.ownership_path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "version": OWNERSHIP_VERSION,
            "target": str(self.target_path),
            "fingerprint": self._owned_fingerprint,
        }
        self.ownership_temp_path.write_text(
            json.dumps(payload, sort_keys=True),
            encoding="utf-8",
        )
        os.replace(self.ownership_temp_path, self.ownership_path)

    def _forget_ownership(self):
        self._owned_fingerprint = None
        if self.ownership_path and self.ownership_path.exists():
            self.ownership_path.unlink()
        if self.ownership_temp_path and self.ownership_temp_path.exists():
            self.ownership_temp_path.unlink()

    def _write_owned_value(self, seconds):
        self.vpower_directory.mkdir(parents=True, exist_ok=True)
        self.temp_path.write_text(f"{seconds}\n", encoding="utf-8")
        os.replace(self.temp_path, self.target_path)
        self._owned_fingerprint = self._fingerprint(self.target_path)
        self._save_owned_fingerprint()

    def _remove_owned_target(self, current_fingerprint):
        owned = self._fingerprints_match(
            current_fingerprint,
            self._owned_fingerprint,
        )
        changed = False
        if owned and self.target_path.exists():
            verification_fingerprint = self._fingerprint(self.target_path)
            if self._fingerprints_match(
                verification_fingerprint,
                self._owned_fingerprint,
            ):
                self.target_path.unlink()
                changed = True

        self._forget_ownership()
        return changed

    def _is_fresh(self, fingerprint):
        if fingerprint is None:
            return False

        age_seconds = self.clock() - (fingerprint["mtimeNs"] / 1_000_000_000)
        return (
            -self.native_file_fresh_seconds
            <= age_seconds
            <= self.native_file_fresh_seconds
        )

    @staticmethod
    def _read_positive_finite_value(path):
        try:
            value = float(path.read_text(encoding="utf-8").strip())
        except (OSError, ValueError):
            return None

        if not math.isfinite(value) or value <= 0:
            return None

        return value

    @staticmethod
    def _fingerprint(path):
        try:
            stat_result = path.stat()
        except OSError:
            return None

        return {
            "device": stat_result.st_dev,
            "inode": stat_result.st_ino,
            "mtimeNs": stat_result.st_mtime_ns,
            "size": stat_result.st_size,
        }

    @staticmethod
    def _fingerprints_match(left, right):
        return left is not None and right is not None and left == right

    @staticmethod
    def _matches_expected_time(current_value, expected_seconds):
        # Native and UPower estimates use different smoothing, so accept a
        # broad range while rejecting tiny or enormous broken vpower values.
        ratio = current_value / float(expected_seconds)
        return NATIVE_TIME_RATIO_MIN <= ratio <= NATIVE_TIME_RATIO_MAX


class RemainingBatteryTimeController:
    def __init__(
        self,
        bridge,
        ensure_vpower_running,
        on_native_support,
        sleep=asyncio.sleep,
        logger=None,
        monotonic=time.monotonic,
        poll_interval_seconds=DEFAULT_POLL_INTERVAL_SECONDS,
        refresh_interval_seconds=DEFAULT_REFRESH_INTERVAL_SECONDS,
    ):
        self.bridge = bridge
        self.ensure_vpower_running = ensure_vpower_running
        self.on_native_support = on_native_support
        self.sleep = sleep
        self.logger = logger
        self.monotonic = monotonic
        self.poll_interval_seconds = float(poll_interval_seconds)
        self.refresh_interval_seconds = float(refresh_interval_seconds)
        self.lifecycle_lock = asyncio.Lock()
        self.task = None
        self.running = False
        self.time_to_empty_seconds = 0
        self.time_to_full_seconds = 0
        self.next_refresh = 0.0
        self.last_error = None

    async def start(self):
        async with self.lifecycle_lock:
            return await self._start_locked()

    async def _start_locked(self):
        if self.task and not self.task.done():
            if self.running:
                return True

            # Native handoff has stopped the writer but is still notifying the
            # plugin. Wait for it to finish before starting a replacement task.
            await self.task

        try:
            await asyncio.to_thread(self.ensure_vpower_running)
            time_to_empty, time_to_full = await self._read_remaining_times()

            self.running = True
            self.time_to_empty_seconds = time_to_empty
            self.time_to_full_seconds = time_to_full
            self.next_refresh = self.monotonic() + self.refresh_interval_seconds
            self.last_error = None
            outcome = self._reconcile()
        except Exception:
            self.running = False
            self.time_to_empty_seconds = 0
            self.time_to_full_seconds = 0
            self.next_refresh = 0.0
            try:
                self.bridge.cleanup()
            except Exception as cleanup_error:
                self._log(
                    "warning",
                    "Failed to clean up remaining battery time bridge after "
                    f"startup error: {cleanup_error}",
                )
            raise

        if outcome["state"] == RECONCILE_NATIVE:
            await self._handle_native_support()
            return False

        self.task = asyncio.create_task(self._run())
        return True

    async def stop(self):
        async with self.lifecycle_lock:
            return await self._stop_locked()

    async def _stop_locked(self):
        task = self.task
        changed = bool(task is not None and not task.done())
        self.running = False

        if task is not None and task is not asyncio.current_task():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        self.task = None
        self.time_to_empty_seconds = 0
        self.time_to_full_seconds = 0
        self.next_refresh = 0.0
        self.last_error = None
        return bool(self.bridge.cleanup() or changed)

    async def _run(self):
        try:
            while self.running:
                try:
                    now = self.monotonic()
                    refreshed = False
                    if now >= self.next_refresh:
                        (
                            self.time_to_empty_seconds,
                            self.time_to_full_seconds,
                        ) = await self._read_remaining_times()
                        refreshed = True
                        self.next_refresh = (
                            self.monotonic() + self.refresh_interval_seconds
                        )

                    outcome = self._reconcile()
                    if self.last_error is not None and refreshed:
                        self._log("info", "Remaining battery time bridge recovered.")
                        self.last_error = None

                    if outcome["state"] == RECONCILE_NATIVE:
                        await self._handle_native_support()
                        return
                except asyncio.CancelledError:
                    raise
                except Exception as error:
                    error_message = str(error)
                    if error_message != self.last_error:
                        self._log(
                            "warning",
                            f"Remaining battery time bridge failed: {error_message}",
                        )
                        self.last_error = error_message
                    self.time_to_empty_seconds = 0
                    self.time_to_full_seconds = 0
                    self.next_refresh = (
                        self.monotonic() + self.refresh_interval_seconds
                    )
                    try:
                        self._reconcile()
                    except Exception:
                        pass

                await self.sleep(self.poll_interval_seconds)
        finally:
            if self.task is asyncio.current_task():
                self.task = None

    async def _read_remaining_times(self):
        time_to_empty = await asyncio.to_thread(
            self.bridge.read_time_to_empty
        )
        read_time_to_full = getattr(self.bridge, "read_time_to_full", None)
        if not callable(read_time_to_full):
            return time_to_empty, 0

        time_to_full = await asyncio.to_thread(read_time_to_full)
        return time_to_empty, time_to_full

    def _reconcile(self):
        if callable(getattr(self.bridge, "read_time_to_full", None)):
            return self.bridge.reconcile(
                self.time_to_empty_seconds,
                self.time_to_full_seconds,
            )

        return self.bridge.reconcile(self.time_to_empty_seconds)

    async def _handle_native_support(self):
        self.running = False
        self.bridge.cleanup()
        try:
            result = self.on_native_support()
            if asyncio.iscoroutine(result):
                await result
        except Exception as error:
            self._log(
                "warning",
                "Failed to finish remaining battery time native handoff: "
                f"{error}",
            )

    def _log(self, level, message):
        if self.logger is None:
            return

        log_method = getattr(self.logger, level, None)
        if log_method:
            log_method(message)
