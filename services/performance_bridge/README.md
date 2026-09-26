# Native Steam performance provider

The standalone service is installed and working on the tested ZOTAC GAMING
ZONE G0A1W, BIOS 1.20, Ryzen 7 8840U, SteamOS 3.9.1 and SteamOS Manager
26.4.1-2. It exposes Steam's **native Performance QAM** controls:

| Native profile | Slow PPT / STAPM / Fast PPT |
| --- | --- |
| low-power | 8 / 8 / 8 W |
| balanced | 15 / 15 / 15 W |
| performance | 28 / 28 / 28 W |
| custom | Native slider, 8–28 W in 1 W steps |

TDP is exposed only while Custom is selected. These are power-limit policies,
using the inspected ONE Launcher preset wattages. They do not reproduce its
Windows CPU-boost policy or change fan settings, GPU clocks, or CPU governors.
This is an opt-in DeckyZone integration, not official Valve or ZOTAC support.

## Why this backend

The running ZOTAC kernel driver does not expose platform profiles or firmware
power attributes on this BIOS. Its required WMI GUID is absent. The conditional
`sysfs.py` adapter remains unavailable for production writes.

The installed RyzenAdj 0.18.0 supports this Hawk Point APU. Its monitoring table
cannot be mapped through `/dev/mem` on this kernel, but its supported limit
commands work through PCI/SMU access. The deployed service copies the exact
validated binary already installed with PowerControl into its own root-owned
runtime directory. It checks the binary hash before every transaction.
It does not load a kernel module, substitute a WMI GUID, flash firmware, or
change thermal, voltage, clock, or current limits.

The bridge checks each command's exit status **and explicit SMU acknowledgement**.
D-Bus values report the last fully acknowledged request, not hardware telemetry.
Independent RAPL package-energy tests measured 7.99–8.03 W for an 8 W request,
14.99–15.02 W for 15 W, and 11.99–12.02 W for a 12 W request sent through Steam.
The 28 W preset was acknowledged by the SMU; it was not sustained-load tested.

## Manager connection and ownership

`install.py` preserves the packaged device configuration and supplies a separate
copy through SteamOS Manager's supported `--device-config` argument. System
and user service drop-ins select that copy. Only the performance-profile and
TDP backend sections change; GPU configuration stays intact. The TDP method is
`remote_interface`; the profile interface is discovered through `remotes.d`.

The provider owns separate system-bus names for `PerformanceProfile1` and
`TdpLimit1`. Withdrawing the TDP name makes Steam hide the slider in presets.
The service uses a process lock, serialized transactions, bounds checks, and
checks for enabled Decky power plugins and known competing power processes.
Both **PowerControl** and **SimpleDeckyTDP** are checked against Decky Loader's
disabled-plugin list. Turning off a plugin's TDP toggle is insufficient: its
startup, resume, or reset handlers can still write power settings. These checks
run before each request and approximately once per second while idle. Detecting
an enabled plugin withdraws both native interfaces and stops the bridge. It does
not disable the other plugin, erase its settings, or automatically restart when
that plugin is disabled later. This is conflict avoidance, not fan-only coexistence.
**Keep PowerControl and other TDP writers disabled.** These checks cannot prevent
an arbitrary external root process from writing limits between checks, and the
blocked metrics table prevents detecting every external hardware change.

For an explicitly supervised coexistence experiment only, a regular root-owned
file `/run/deckyzone-powercontrol-coexistence-test`, not writable by group or
others, containing exactly `allow-powercontrol-for-testing` followed by a newline
bypasses the **PowerControl enabled-plugin check only**. The diagnostic marks
PowerControl with `coexistence_test: true`. SimpleDeckyTDP and competing-process
checks still apply. This does not change PowerControl, make it fan-only, or
prevent its QAM patches and game profiles from overriding native settings.
Remove the file to restore the normal guard, or reboot: `/run` is temporary.
If PowerControl is still enabled when the file is removed, the running bridge
withdraws on its next ownership check. After reboot it remains blocked until
PowerControl is disabled or a new supervised experiment is explicitly enabled.

A failure stops the command sequence, withdraws the provider, and requires
manual inspection. There is no automatic service restart, write retry, or
hardware rollback after partial application. The last complete selection and
custom wattage are stored under `/var/lib/deckyzone-performance/state.json`.
Startup reapplies that selection (first start: Custom, 15 W). Resume and charger
changes each trigger a single reapplication; normal polling does not write.
Stopping the service leaves the last limits in place.
A readiness notification and start/stop hooks reconnect the user Manager after
provider lifecycle changes, working around a reproduced Manager 26.4.1 remote
reconnection stall. These hooks restart Manager, not Steam. They skip the
reconnect when the system or user session is stopping or unavailable, including
system shutdown. Normal running, degraded, and starting sessions remain eligible.

Steam's native TDP enable switch retains its normal meaning: disabling it while
in Custom can request the maximum, 28 W. Steam applies its saved TDP before its
saved profile during game transitions. When leaving a preset, the TDP interface
is still absent and that first request does not reach the bridge. DeckyZone's
frontend listens to native settings and capability changes, then replays the
current native TDP setting once Custom is available and this bridge is active.
It uses Steam's own setting setter, keeps the TDP-off choice intact, and cancels
stale work when settings change or the plugin unloads. Readiness checks are
bounded; failed writes are not retried. Ordinary slider updates and external
hardware changes do not trigger replays.

Steam still owns per-game persistence. Automatic restoration across a preset to
Custom transition requires DeckyZone's frontend to be loaded; the standalone
provider does not read Steam's profile files or maintain a separate game database.

## Installation and removal

This is separate from the Decky plugin lifecycle. It is not automatically
installed by a normal DeckyZone update. Once installed, **DeckyZone → Performance
→ Native Performance Controls** enables or disables the service and its startup
at boot. The status text distinguishes a running bridge from a stopped or blocked
one; the switch represents the startup setting. A blocked bridge can still be
turned off. Activation rechecks compatibility and ownership in the backend.
Disabling preserves the saved profiles and last applied limits, and leaves
PowerControl's settings alone. The control refreshes its status every five
seconds while its panel is mounted. Missing or older bridge installations show
an unavailable toggle until installed or updated separately.

The installer requires root, `--enable`,
the exact tested device/BIOS/APU, the tested Manager version, disabled competing
plugins, and the expected existing RyzenAdj binary hash. A payload contains
`services/` and `vendor/dbus_next/` (dbus-next 0.2.3). From that verified payload:

```sh
sudo python3 -m services.performance_bridge.install install --enable
```

The installer refuses to overwrite existing integration files. It stores the
original vendor config and hashes of every new integration file in
`/var/lib/deckyzone-performance/`. It enables `deckyzone-performance.service`,
reloads the D-Bus policy, and restarts the two Manager services. No Steam restart
or Decky plugin reload was needed on the tested device.

To remove the integration while preserving its state and audit files:

```sh
cd /var/lib/deckyzone-performance
sudo python3 -m services.performance_bridge.install rollback --enable
```

Rollback verifies file hashes, disables the provider, removes only its own
config/drop-ins, and restores stock Manager service selection. It leaves the
last applied power limits unchanged. It refuses removal if an integration
file was edited after installation.

## Verification

Live validation confirmed both Manager interfaces, all four profile transitions,
Custom-only TDP discovery, native Steam settings calls, and the actual rendered
QAM dropdown and 15 W slider with 8/28 W endpoints. Charger transitions,
suspend/wake, and service restart were tested on the device; selected limits
were restored. Later slider/profile changes made by the user were preserved. No UI injection or custom
Decky slider is involved. See the [investigation and test record](../../docs/research/native-performance-investigation-2026-09-25.md).

Read-only capability inspection:

```sh
sudo python3 -m services.performance_bridge probe
```

The report distinguishes the unavailable kernel backend from the opted-in
RyzenAdj fallback and labels its state as acknowledged requests. It includes the
detected OS, Manager package version, and installation/disabled state of both
PowerControl and SimpleDeckyTDP.

## Compatibility gate

Installation, startup, and runtime monitoring require `ID=steamos` in
`os-release` and the exact tested `steamos-manager` package, `26.4.1-2`.
The package version is read from installed package metadata on each check, so
an upgrade or downgrade stops further bridge writes until the new version is
validated. Rollback remains available on an unsupported OS or Manager version.

This is a validation allowlist, not a claim that every other version lacks the
required interfaces. Stable/Beta channel names and the Steam client channel do
not establish compatibility. Older Manager versions can lack required APIs or
have different remote-provider lifecycle behavior. Widening support requires
checking `--device-config`, the two remote D-Bus interfaces, discovery/removal,
native QAM behavior, and suspend/resume on that version.

The existing ZOTAC model, BIOS, and APU checks still apply. This fallback is not
for Valve Steam Deck hardware and does not replace its native power backend.

Isolated tests never access hardware:

```sh
python3 -m venv /tmp/deckyzone-bridge-venv
/tmp/deckyzone-bridge-venv/bin/pip install -r services/performance_bridge/requirements.txt pytest==8.4.2 pytest-asyncio==1.2.0
dbus-run-session -- /tmp/deckyzone-bridge-venv/bin/python -m pytest services/performance_bridge/tests -q
```

The tests cover the D-Bus contract, profile/slider lifecycle, duplicate names,
bus loss, serialized requests, unsafe input, custom persistence, power-event
reapplication, compatibility and conflict checks, service toggle transitions,
and failures at each of the three hardware-command positions.
`dbus-next` 0.2.3 emits deprecation warnings on Python 3.14.
