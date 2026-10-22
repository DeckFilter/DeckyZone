"""Optional global CPU boost preference through SteamOS Manager's user API."""

import asyncio
import json
import logging
from pathlib import Path
import pwd
import subprocess
import time

from fan_curve import atomic_json, read_json
from fan_hardware import conflicts


LOG = logging.getLogger(__name__)
DESTINATION = "com.steampowered.SteamOSManager1"
OBJECT = "/com/steampowered/SteamOSManager1"
INTERFACE = DESTINATION + ".CpuBoost1"


class CpuBoost:
    def __init__(self, settings_directory, homebrew, user_name):
        self.path = Path(settings_directory) / "cpu-boost.json"
        self.homebrew = Path(homebrew)
        self.user_name = user_name
        self.lock = asyncio.Lock()
        self.stop = asyncio.Event()
        self.task = None
        self.closing = False
        self.restore_pending = True
        self.sleep_elapsed = self._sleep_elapsed()

    @staticmethod
    def _sleep_elapsed():
        # CLOCK_BOOTTIME includes suspend; MONOTONIC excludes it. No sleep
        # inhibitor or shutdown service is needed for a CPU boost preference.
        return time.clock_gettime(time.CLOCK_BOOTTIME) - time.monotonic()

    def _command(self, action, *args):
        user = pwd.getpwnam(self.user_name)
        runtime = Path(f"/run/user/{user.pw_uid}")
        if not (runtime / "bus").exists():
            raise RuntimeError("SteamOS Manager's user session is unavailable")
        result = subprocess.run(
            ["/usr/bin/busctl", "--user", "--timeout=2", "--json=short",
             action, DESTINATION, OBJECT, INTERFACE, "CpuBoostState", *args],
            user=user.pw_uid, group=user.pw_gid, extra_groups=(),
            env={"PATH": "/usr/bin", "LD_LIBRARY_PATH": "",
                 "XDG_RUNTIME_DIR": str(runtime),
                 "DBUS_SESSION_BUS_ADDRESS": f"unix:path={runtime}/bus"},
            capture_output=True, text=True, timeout=3, check=False,
        )
        if result.returncode:
            raise RuntimeError("CPU boost is unavailable through SteamOS Manager")
        return result.stdout

    def _read(self):
        value = json.loads(self._command("get-property"))
        if (not isinstance(value, dict) or value.get("type") != "u"
                or type(value.get("data")) is not int or value["data"] not in (0, 1)):
            raise ValueError("SteamOS Manager returned an unknown CPU boost state")
        return bool(value["data"])

    def _saved(self):
        if not self.path.exists():
            return None
        value = read_json(self.path).get("enabled")
        if type(value) is not bool:
            raise ValueError("Saved CPU boost setting is invalid")
        return value

    def _conflicts(self):
        # Require a readable, valid loader configuration before taking ownership.
        return conflicts(self.homebrew)

    def _check_ownership(self):
        active = self._conflicts()
        if active:
            raise RuntimeError(f"Disable {' and '.join(active)} in Decky settings")

    def _status(self):
        state = {"available": False, "enabled": None, "savedEnabled": None,
                 "blockedReason": "", "conflictingPlugins": []}
        try:
            state["conflictingPlugins"] = self._conflicts()
            state["savedEnabled"] = self._saved()
            if state["conflictingPlugins"]:
                state["blockedReason"] = (
                    f"Disable {' and '.join(state['conflictingPlugins'])} in Decky settings"
                )
        except (OSError, ValueError) as error:
            state["blockedReason"] = str(error)
        try:
            state["enabled"] = self._read()
            state["available"] = True
        except (OSError, ValueError, KeyError, subprocess.SubprocessError, RuntimeError) as error:
            state["blockedReason"] = state["blockedReason"] or str(error)
        return state

    def _apply(self, enabled):
        self._check_ownership()
        current = self._read()
        if current != enabled:
            self._check_ownership()
            if self.closing:
                raise RuntimeError("DeckyZone is stopping")
            self._command("set-property", "u", str(int(enabled)))
            if self._read() != enabled:
                raise RuntimeError("CPU boost change was not applied")
            LOG.info("CPU boost %s", "enabled" if enabled else "disabled")

    def _set(self, enabled):
        previous = self._read()
        try:
            self._apply(enabled)
            atomic_json(self.path, {"enabled": enabled})
        except Exception:
            # A settings-write failure must not leave an unsaved hardware change.
            try:
                if not self.closing and self._read() == enabled:
                    self._apply(previous)
            except Exception:
                LOG.warning("Could not restore CPU boost after a failed change", exc_info=True)
            raise
        self.restore_pending = False
        return self._status()

    def _observe(self):
        elapsed = self._sleep_elapsed()
        resumed = elapsed - self.sleep_elapsed > 0.5
        self.sleep_elapsed = elapsed
        desired = self._saved()
        if desired is None:
            return
        if self._conflicts():
            # Relinquish ownership without writing over the newly enabled plugin.
            # As with the bridge, the user must opt in again after a conflict.
            self.path.unlink(missing_ok=True)
            self.restore_pending = False
            LOG.info("Stopped managing CPU boost because another power plugin is enabled")
            return
        self.restore_pending = self.restore_pending or resumed
        if self.restore_pending:
            self._apply(desired)
            self.restore_pending = False

    async def _run(self, action, *args):
        # Finish an in-flight bounded subprocess before releasing the write lock,
        # including when Decky cancels a caller during unload.
        operation = asyncio.create_task(asyncio.to_thread(action, *args))
        try:
            return await asyncio.shield(operation)
        except asyncio.CancelledError:
            await operation
            raise

    async def status(self):
        async with self.lock:
            return await self._run(self._status)

    async def set_enabled(self, enabled):
        if type(enabled) is not bool:
            raise ValueError("CPU boost must be enabled or disabled")
        async with self.lock:
            if self.closing:
                raise RuntimeError("DeckyZone is stopping")
            state = await self._run(self._set, enabled)
            if self.task is None or self.task.done():
                self.stop.clear()
                self.task = asyncio.create_task(self._monitor())
            return state

    async def _monitor(self):
        last_error = None
        while not self.stop.is_set():
            try:
                async with self.lock:
                    if self.closing:
                        return
                    await self._run(self._observe)
                last_error = None
            except Exception as error:
                if str(error) != last_error:
                    LOG.warning("Could not restore CPU boost: %s", error)
                    last_error = str(error)
            try:
                await asyncio.wait_for(self.stop.wait(), timeout=2)
            except asyncio.TimeoutError:
                pass

    async def startup(self):
        self.closing = False
        self.stop.clear()
        self.restore_pending = True
        self.sleep_elapsed = self._sleep_elapsed()
        if self.task is None or self.task.done():
            self.task = asyncio.create_task(self._monitor())

    async def shutdown(self, reset=False):
        self.closing = True
        self.stop.set()
        if self.task is not None:
            await self.task
            self.task = None
        try:
            async with self.lock:
                # Stop only our monitor. Kernel boost policy needs no shutdown
                # restoration, and the session Manager may already be stopping.
                if reset:
                    self.path.unlink(missing_ok=True)
        finally:
            if reset:
                self.closing = False
        return {"name": "stopCpuBoost", "ok": True, "changed": True, "message": "CPU boost preference released"}
