"""Serialize transactions and stop permanently after uncertain application."""

from threading import RLock

from .sysfs import PROFILES, Snapshot, SysfsBackend, Unavailable


class Controller:
    def __init__(self, backend: SysfsBackend, check_ownership):
        self.backend = backend
        self.check_ownership = check_ownership
        self.lock = RLock()
        self.fault = None
        self.check_ownership()
        self.snapshot = backend.read()
        # Session-only custom value. Steam retains responsibility for game settings.
        value = self.snapshot.limits[0]
        self.custom_tdp = getattr(
            backend,
            "custom_tdp",
            value if backend.minimum <= value <= backend.maximum else None,
        )

    def _check(self) -> Snapshot:
        if self.fault:
            raise Unavailable(self.fault)
        try:
            self.check_ownership()
            if hasattr(self.backend, "refresh_after_power_event"):
                self.backend.refresh_after_power_event()
            current = self.backend.read()
            if current != self.snapshot:
                raise Unavailable("Driver state changed outside the bridge")
            return current
        except (OSError, ValueError, Unavailable) as error:
            self.fault = str(error)
            raise Unavailable(self.fault) from error

    def read(self) -> Snapshot:
        with self.lock:
            return self._check()

    def change(
        self, *, profile: str | None = None, watts: int | None = None
    ) -> Snapshot:
        with self.lock:
            before = self._check()
            if (profile is None) == (watts is None):
                raise ValueError("Exactly one property must be changed")
            if profile is not None and profile not in PROFILES:
                raise ValueError("Unknown performance profile")
            if watts is not None:
                if before.profile != "custom":
                    raise ValueError("TDP is only writable in Custom")
                if (
                    type(watts) is not int
                    or not self.backend.minimum <= watts <= self.backend.maximum
                ):
                    raise ValueError("TDP is outside the common whole-watt range")
            if profile == "custom" and self.custom_tdp is None:
                raise ValueError("No valid custom TDP is available")
            if profile == before.profile or (
                watts is not None and before.limits == (watts,) * 3
            ):
                return before
            try:
                if profile == "custom":
                    # Attribute writes themselves select Custom in the inspected ABI.
                    # Do not first replay the driver's preset-derived custom cache.
                    self.backend.set_tdp(self.custom_tdp)
                elif profile is not None:
                    self.backend.set_profile(profile)
                else:
                    self.backend.set_tdp(watts)
                after = self.backend.read()
                expected_profile = profile or "custom"
                expected_tdp = self.custom_tdp if profile == "custom" else watts
                if after.profile != expected_profile:
                    raise Unavailable("Driver did not report the requested profile")
                if expected_tdp is not None and after.limits != (expected_tdp,) * 3:
                    raise Unavailable(
                        "Driver did not report all three requested limits"
                    )
            except (OSError, ValueError, Unavailable) as error:
                self.fault = f"Application uncertain; no retry or rollback: {error}"
                raise Unavailable(self.fault) from error
            self.snapshot = after
            if after.profile == "custom":
                self.custom_tdp = after.limits[0]
            return after
