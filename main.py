import asyncio
import os
import subprocess

import decky
import plugin_settings


SUPPORTED_BOARDS = {"G0A1W", "G1A1W"}
INPUTPLUMBER_DBUS_PATH = "/org/shadowblip/InputPlumber/CompositeDevice0"
DBUS_READY_MESSAGE = "Waiting to apply startup mode."
UNSUPPORTED_MESSAGE = "Unsupported device: startup mode only applies on Zotac Zone."
DISABLED_MESSAGE = "Startup mode apply is disabled."
DISABLED_REBOOT_MESSAGE = (
    "Startup mode apply is disabled. Reboot to restore unmodified InputPlumber startup behavior."
)
READY_TIMEOUT_SECONDS = 5.0
READY_POLL_INTERVAL_SECONDS = 0.5
STARTUP_MODE = "xbox-elite"


class DeckyZoneService:
    def __init__(
        self,
        command_runner=subprocess.run,
        sleep=asyncio.sleep,
        logger=decky.logger,
        read_text=None,
        settings_store=plugin_settings,
    ):
        self.command_runner = command_runner
        self.sleep = sleep
        self.logger = logger
        self.read_text = read_text or self._read_text
        self.settings_store = settings_store
        self._status = {"state": "idle", "message": DBUS_READY_MESSAGE}
        self._privilege_context_logged = False
        self._inputplumber_available = False
        self._startup_applied_this_session = False

    def get_status(self):
        return dict(self._status)

    def get_settings(self):
        return {
            "startupApplyEnabled": self.settings_store.get_startup_apply_enabled(),
            "inputplumberAvailable": self.probe_inputplumber_available(),
        }

    def _set_status(self, state, message):
        self._status = {"state": state, "message": message}

    def _read_text(self, path):
        with open(path, "r", encoding="utf-8") as handle:
            return handle.read().strip()

    def get_env(self):
        env = os.environ.copy()
        env["LD_LIBRARY_PATH"] = ""
        return env

    def _busctl_args(self, *args):
        return ["busctl", *args]

    def _get_ids(self):
        return os.getuid(), os.geteuid()

    def log_privilege_context(self):
        if self._privilege_context_logged:
            return

        uid, euid = self._get_ids()
        elevated = uid == 0 or euid == 0
        self.logger.info(
            f"DeckyZone privilege context: uid={uid} euid={euid} elevated={elevated}"
        )
        self._privilege_context_logged = True

    def is_supported_device(self):
        try:
            vendor = self.read_text("/sys/devices/virtual/dmi/id/sys_vendor")
            board = self.read_text("/sys/devices/virtual/dmi/id/board_name")
        except Exception:
            return False
        return vendor == "ZOTAC" and board in SUPPORTED_BOARDS

    def _probe_inputplumber_profile_name(self):
        result = self.command_runner(
            self._busctl_args(
                "get-property",
                "org.shadowblip.InputPlumber",
                INPUTPLUMBER_DBUS_PATH,
                "org.shadowblip.Input.CompositeDevice",
                "ProfileName",
            ),
            check=True,
            text=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=self.get_env(),
        )
        self._inputplumber_available = result.returncode == 0
        return self._inputplumber_available

    def probe_inputplumber_available(self):
        try:
            return self._probe_inputplumber_profile_name()
        except Exception:
            self._inputplumber_available = False
            return False

    def set_startup_apply_enabled(self, enabled):
        enabled = self.settings_store.set_startup_apply_enabled(enabled)

        if enabled:
            if not self.is_supported_device():
                self._set_status("unsupported", UNSUPPORTED_MESSAGE)
            else:
                self._set_status("idle", DBUS_READY_MESSAGE)
        elif self._startup_applied_this_session:
            self._set_status("disabled", DISABLED_REBOOT_MESSAGE)
        else:
            self._set_status("disabled", DISABLED_MESSAGE)

        return {
            "startupApplyEnabled": enabled,
            "inputplumberAvailable": self.probe_inputplumber_available(),
        }

    async def wait_for_inputplumber_dbus(
        self,
        timeout=READY_TIMEOUT_SECONDS,
        interval=READY_POLL_INTERVAL_SECONDS,
    ):
        self._set_status("waiting", "Waiting for InputPlumber D-Bus.")
        elapsed = 0.0

        while elapsed < timeout:
            try:
                if self._probe_inputplumber_profile_name():
                    return True
            except Exception:
                self._inputplumber_available = False

            await self.sleep(interval)
            elapsed += interval

        self._inputplumber_available = False
        self._set_status(
            "failed",
            f"InputPlumber D-Bus was not ready within {timeout:.1f}s.",
        )
        return False

    async def apply_startup_mode(self):
        if not self.is_supported_device():
            self._set_status("unsupported", UNSUPPORTED_MESSAGE)
            return self.get_status()

        if not await self.wait_for_inputplumber_dbus():
            return self.get_status()

        self.log_privilege_context()

        try:
            self.command_runner(
                self._busctl_args(
                    "call",
                    "org.shadowblip.InputPlumber",
                    INPUTPLUMBER_DBUS_PATH,
                    "org.shadowblip.Input.CompositeDevice",
                    "SetTargetDevices",
                    "as",
                    "3",
                    STARTUP_MODE,
                    "keyboard",
                    "mouse",
                ),
                check=True,
                text=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=self.get_env(),
            )
        except subprocess.CalledProcessError as error:
            detail = (error.stderr or error.stdout or str(error)).strip()
            self._set_status("failed", f"Failed to apply startup mode: {detail}")
            return self.get_status()
        except Exception as error:
            self._set_status("failed", f"Failed to apply startup mode: {error}")
            return self.get_status()

        self._startup_applied_this_session = True
        self._set_status("applied", f"Startup mode re-applied: {STARTUP_MODE}.")
        return self.get_status()


class Plugin:
    def __init__(self, service=None):
        self.loop = None
        self.startup_task = None
        self.service = service or DeckyZoneService()

    async def get_status(self):
        return self.service.get_status()

    async def get_settings(self):
        return self.service.get_settings()

    async def set_startup_apply_enabled(self, enabled):
        if not enabled and self.startup_task and not self.startup_task.done():
            self.startup_task.cancel()
            try:
                await self.startup_task
            except asyncio.CancelledError:
                pass
            self.startup_task = None

        return self.service.set_startup_apply_enabled(enabled)

    async def _main(self):
        self.loop = asyncio.get_event_loop()
        decky.logger.info("DeckyZone starting")
        settings = self.service.get_settings()
        if settings["startupApplyEnabled"]:
            self.startup_task = self.loop.create_task(self.service.apply_startup_mode())
        else:
            self.service.set_startup_apply_enabled(False)

    async def _unload(self):
        decky.logger.info("DeckyZone stopping")
        if self.startup_task and not self.startup_task.done():
            self.startup_task.cancel()
            try:
                await self.startup_task
            except asyncio.CancelledError:
                pass

    async def _uninstall(self):
        decky.logger.info("DeckyZone uninstall")

    async def _migration(self):
        decky.logger.info("Migrating DeckyZone")
        decky.migrate_logs(
            os.path.join(
                decky.DECKY_USER_HOME,
                ".config",
                "deckyzone",
                "deckyzone.log",
            )
        )
        decky.migrate_settings(
            os.path.join(decky.DECKY_HOME, "settings", "deckyzone.json"),
            os.path.join(decky.DECKY_USER_HOME, ".config", "deckyzone"),
        )
        decky.migrate_runtime(
            os.path.join(decky.DECKY_HOME, "deckyzone"),
            os.path.join(decky.DECKY_USER_HOME, ".local", "share", "deckyzone"),
        )
