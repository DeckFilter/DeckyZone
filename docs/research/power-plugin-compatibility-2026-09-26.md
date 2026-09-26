# Power plugin compatibility, 26 September 2026

## Scope and implementation

The user requested installing and testing SimpleDeckyTDP on the ZONE, and
blocking native controls whenever PowerControl or SimpleDeckyTDP is enabled.
The earlier PowerControl coexistence experiment is now closed. Its temporary
marker is removed from the device and no longer bypasses the code's guard.
Neither competing plugin's code was modified.

The existing `NativePerformanceControl.tsx` is the canonical UI transaction:
its in-flight guard, optimistic update, backend reconciliation, rollback refetch,
and five-second status refresh are preserved. It now disables the control and
names active competitors. The bridge already checks Decky's disabled-plugin
list before writes and about once per second while idle. The existing stop hook
now disables its systemd startup setting when either plugin is active. This
works without the panel or DeckyZone frontend being open. It never automatically
re-enables the bridge when the competing plugin stops.

The stop hook uses `systemctl disable` without `--now`, since waiting for its own
stop job would deadlock. The command has a five-second timeout; Manager reconnect
still runs even if disabling fails. The prior shutdown reconnect guards remain.
The existing fail-closed provider exits with status 2 on an ownership conflict;
its unit therefore reports failed and disabled, with no provider process.

## Release and test setup

- ZOTAC ZONE G0A1W, BIOS 1.20, Ryzen 7 8840U, SteamOS 3.9.2,
  SteamOS Manager 26.4.1-2.
- PowerControl 3.15.1, original code and user profiles.
- Official [SimpleDeckyTDP 1.0.7 release](https://github.com/aarron-lee/SimpleDeckyTDP/releases/tag/v1.0.7).
- Release ZIP SHA-256:
  `dae7cf43ec8936c07a94a08ac418be8d9e129744a54f3aa63d2b31222bc0ad38`,
  matched the GitHub release asset digest before installation.
- Backup: `/home/deck/homebrew/plugin-backups/DeckyZone.power-plugin-compat-20260926-073925`.
- Settings and original changed runtime files were backed up outside the live
  plugin directory. Installation crossed two filesystems, so the release was
  staged under plugin-backups before the final rename into the live directory.

SimpleDeckyTDP was absent before this test. It was installed disabled, with a
12 W default profile, CPU/GPU/undervolting/charge controls and polling disabled.
Its `supportsRyzenadjCoall` setting was seeded false to avoid the optional startup
curve-optimizer probe. This is a restricted test configuration, not proof of all
of the plugin's features. The unmodified plugin's TDP command includes 95 C
thermal-limit arguments as well as the three wattage limits.

## Device evidence

At 07:42:36 both competing plugins were installed but disabled; the bridge was
active and enabled, with no blocker. Enabling SimpleDeckyTDP triggered bridge
withdrawal and persistent startup disable at 07:42:50. Its own 12 W commands
began at 07:42:51. The backend rejected a subsequent native-enable request and
reported `conflictingPlugins: ["SimpleDeckyTDP"]`. The rendered DeckyZone row
was unchecked and disabled, with `Disable SimpleDeckyTDP in Decky settings`.
The panel was closed during activation and withdrawal.

SimpleDeckyTDP's TDP control was tested with PowerControl and the native bridge
off. Eight bounded CPU workers ran for 21-second captures; the final ten
one-second RAPL package-energy samples were:

| SimpleDeckyTDP selection | Measured range | Median |
| --- | --- | --- |
| 12 W | 11.97–12.01 W | 12.00 W |
| 10 W | 9.99–10.01 W | 10.00 W |

The highest reported temperature was below 66 C, and the fan continued spinning.
The first measurement attempt could not start its Python 3.14 workers; it is
excluded. The successful captures explicitly used forked workers and verified
that all remained running. These measurements establish basic TDP control on
this device, not game-profile, suspend/resume, or all-feature compatibility.

After SimpleDeckyTDP was disabled, native controls remained off and the row
became available. Invoking its actual rendered onChange handler started the
bridge at 07:47:20 with Low Power / 8 W. The row reconciled to checked and enabled.
The panel was closed, then PowerControl was enabled. The bridge withdrew at
07:47:43 and disabled startup at 07:47:44. Reopening the panel showed the unchecked,
disabled row with `Disable PowerControl in Decky settings`. The backend rejected
another enable request. This verifies both activation directions and the
installed-but-disabled case. Physical controller focus/navigation was not tested;
the existing Steam control primitive was retained.

Final verification confirmed both provider bus names absent, startup disabled,
no bridge PID, PowerControl active, and SimpleDeckyTDP installed but disabled.
PowerControl's three code hashes and all user profiles/fan-curve values matched
the backup. On reload PowerControl added only its own
`supportsRyzenadjCoall: false` capability cache; that field was retained.
CPU boost stayed enabled, SMT stayed on, and PowerControl fan RPCs remained live.

## Local validation and limitations

The production build, type checking with `--skipLibCheck`, Python syntax checks,
and `git diff --check` passed. All 43 focused runtime/control tests passed. A
broader run passed 62 synchronous checks; its four private-D-Bus tests require
`dbus-run-session`, which is absent on this Mac. Those four are not claimed as
passing. The real-device checks above exercise actual systemd, Decky RPC,
D-Bus withdrawal, and rendered toggle state.

No reboot or suspend test was performed in this pass. The systemd disabled state
was read back directly. The guard is bounded polling plus checks before requests;
it cannot arbitrate arbitrary external root writers or prevent every overlap
inside another plugin's startup handler.
