import asyncio
import json
import time
from pathlib import Path


class MappingRuntime:
    def __init__(self, directory, logger, on_brightness):
        self.directory = Path(directory)
        self.logger = logger
        self.process = None
        self.profile = None
        self.on_brightness = on_brightness
        self.reader = None
        self.error = ""
        self.retry_after = 0
        self.recovery_pending = False
        self.suspend_offset = self._suspend_offset()
        self.lock = asyncio.Lock()

    @staticmethod
    def _suspend_offset():
        # BOOTTIME includes sleep; MONOTONIC only advances while awake.
        return time.clock_gettime(
            getattr(time, "CLOCK_BOOTTIME", time.CLOCK_MONOTONIC)
        ) - time.monotonic()

    def needs_recovery(self, profile):
        suspend_offset = self._suspend_offset()
        if suspend_offset - self.suspend_offset > 0.5:
            self.recovery_pending = True
            self.retry_after = 0
            self.logger.info("System resumed; restoring controller mappings.")
        self.suspend_offset = suspend_offset
        return (
            time.monotonic() >= self.retry_after
            and (
                self.recovery_pending
                or (
                    profile is not None
                    and (
                        profile != self.profile
                        or self.process is None
                        or self.process.returncode is not None
                    )
                )
            )
        )

    def defer_recovery(self):
        self.recovery_pending = True
        self.retry_after = time.monotonic() + 5

    async def stop(self):
        async with self.lock:
            return await self._stop()

    async def _stop(self):
        process, self.process = self.process, None
        self.profile = None
        if process is None:
            return True
        if process.returncode is None:
            process.terminate()
        try:
            if self.reader is not None:
                await asyncio.wait_for(self.reader, 20)
                self.reader = None
            output, _ = await asyncio.wait_for(process.communicate(), 20)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise RuntimeError(
                "Mapping worker did not stop; recovery data was retained."
            )
        if process.returncode:
            raise RuntimeError(
                "Mapping worker failed: "
                + (self.error or output.decode().strip()[-600:])
            )
        return True

    async def read_events(self, process):
        while line := await process.stdout.readline():
            try:
                event = json.loads(line)
                if event.get("brightness") in ("up", "down"):
                    await self.on_brightness(event["brightness"])
                elif "error" in event:
                    self.error = str(event["error"])
                    self.logger.warning("Controller mappings: " + self.error)
            except Exception as error:
                self.logger.warning(f"Mapping worker event failed: {error}")

    async def sync(self, profile):
        async with self.lock:
            return await self._sync(profile)

    async def _sync(self, profile):
        if (
            profile == self.profile
            and not self.recovery_pending
            and self.process is not None
            and self.process.returncode is None
        ):
            return True
        await self._stop()
        if (
            profile is None
            and not (self.directory / "controller-mapping-backup.json").exists()
        ):
            self.recovery_pending = False
            self.retry_after = 0
            return True
        process = await asyncio.create_subprocess_exec(
            "/usr/bin/python3",
            str(Path(__file__).with_name("controller_mapping_worker.py")),
            str(self.directory),
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
        )
        self.process = process
        self.error = ""
        process.stdin.write((json.dumps(profile) + "\n").encode())
        await process.stdin.drain()
        process.stdin.close()
        try:
            line = await asyncio.wait_for(process.stdout.readline(), 25)
            try:
                response = json.loads(line)
            except (ValueError, TypeError) as error:
                raise RuntimeError(
                    "Mapping worker could not start: " + line.decode().strip()[:300]
                ) from error
            if not response.get("ready"):
                raise RuntimeError(
                    response.get("error", "Mapping worker could not start.")
                )
            self.profile = profile
            self.recovery_pending = False
            self.retry_after = 0
            self.reader = asyncio.create_task(self.read_events(process))
            if profile is None:
                await self._stop()
            return True
        except Exception:
            self.defer_recovery()
            try:
                await self._stop()
            except Exception as error:
                self.logger.warning(str(error))
            raise
