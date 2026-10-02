# DeckyZone

[![](https://img.shields.io/github/downloads/DeckFilter/DeckyZone/total.svg)](https://github.com/DeckFilter/DeckyZone/releases)
[![](https://img.shields.io/github/downloads/DeckFilter/DeckyZone/latest/total)](https://github.com/DeckFilter/DeckyZone/releases/latest)
[![](https://img.shields.io/github/v/release/DeckFilter/DeckyZone)](https://github.com/DeckFilter/DeckyZone/releases/latest)

DeckyZone is a Decky Loader plugin for the Zotac Gaming Zone. It adds custom controller mappings, display fixes and hardware settings.

![screenshot](./img/DeckyZone.jpg)

## Installation

Run this command in a terminal:

```bash
curl -L https://raw.githubusercontent.com/DeckFilter/DeckyZone/main/install.sh | sh
```

## Current features

Status key: ✅ tested and working, ❌ failed testing, ❓ untested or unknown, N/A unavailable by design.

### Controller

| Feature                              | SteamOS | Bazzite | CachyOS |
| ------------------------------------ | ------- | ------- | ------- |
| Controller mode status and recovery  | ✅      | ✅      | ✅      |
| Steam Home action                    | ✅      | ✅      | ✅      |
| Brightness dial control              | ✅      | ✅      | ✅      |
| Gyro Orientation Fix                 | ✅      | ✅      | ✅      |
| Default trackpad behavior            | ✅      | ✅      | ✅      |
| Trackpad disabling                   | ✅      | ✅      | ✅      |
| Trackpad button input                | ✅      | ✅      | ✅      |
| Custom Rumble Strength               | ✅      | ✅      | ✅      |
| Test Rumble                          | ✅      | ✅      | ✅      |
| Per-game trackpad and rumble settings | ✅      | ✅      | ✅      |
| Simulate Xbox Controller per game    | ✅      | ✅      | ✅      |

In Gamepad mode, the left dial controls volume and the right dial controls brightness by default. Brightness support works automatically while the plugin is running.

Open **Controller settings** in the Controller panel to configure mappings and rumble globally or for individual games. **General** contains **Custom Rumble Strength**, **Intensity** and **Test Rumble**. Game profiles also include **Simulate Xbox Controller**. These quick controls remain available in the Quick Access Menu, which shows whether rumble changes apply globally or to the current game.

Under **Dials**, choose **Volume**, **Brightness** or **Custom** for either dial. Custom lets you assign a command to each direction. In global settings, **Buttons** lets the Home button take a **Screenshot (Default)** or open **Steam Home**. This action applies to every game.

Each trackpad has its own **Behavior** setting:

- **Scroll Wheel (Default)** on the left and **As Mouse (Default)** on the right.
- **None** turns off that trackpad.
- **Button Pad** lets you assign commands to its four directions.

Games without custom settings use the global settings. Use **Game settings** on the global controller screen to edit saved profiles without launching a game, including profiles with only rumble or Xbox simulation settings. Opening a profile does not change it; saving a change enables that game's settings. A game without saved mappings continues to use the global mappings.

The trash button removes all of a game's controller settings after confirmation, including mappings, rumble overrides and Xbox simulation. The game then uses global mappings and rumble settings. Use **Global settings** to return to the global controller screen.

Gyro Orientation Fix corrects the gyro orientation when InputPlumber does not include the fix. Changing this setting restarts InputPlumber. Once InputPlumber includes the fix, you can turn this setting off to remove the temporary correction.

### Customization

| Feature                    | SteamOS | Bazzite | CachyOS |
| -------------------------- | ------- | ------- | ------- |
| Zotac Controller Artwork   | ✅      | ✅      | ✅      |
| Hide Unsupported Controls  | ✅      | ✅      | ✅      |
| Remaining Battery Time Fix | ✅      | N/A     | N/A     |

Zotac Controller Artwork replaces supported Steam controller previews, game launch animations, calibration images, and button glyphs with Zotac versions. Launch animations follow Steam's controller, mouse, or touchscreen hint for the selected layout.

Hide Unsupported Controls hides the L5 and R5 controls and Steam Input trackpad settings that do not work on the ZONE. Configure the physical trackpads in **Controller settings > Trackpads**.

Remaining Battery Time Fix shows estimated time to full or empty in Steam. It is available only on SteamOS and turns itself off when the system provides valid estimates for both charging and discharging.

### Display

| Feature                   | SteamOS  | Bazzite | CachyOS |
| ------------------------- | -------- | ------- | ------- |
| Enable Zotac OLED Profile | Built in | ✅      | ✅      |
| Green Tint Compensation   | ✅       | ✅      | ✅      |

Reboot after changing display settings. Previous testing found that HDR and washed-out colors needed no additional fix on SteamOS `main`, SteamOS 3.8.1 Preview, Bazzite and CachyOS.

Green Tint Compensation adjusts the OLED profile's white point. It may not correct green tint at low brightness.

#### Display research resources

- [Zotac display and EC firmware update guide](https://www.zotac.com/de/faq/zotac-gaming-zone-how-update-display-firmware-or-battery-indicator-firmware)
- [DXQ7D0023 / Chipone ICNA3512 panel driver](https://github.com/csvke/panel-chipone-icna3512)
- [ICNA3512 panel initialization reference](https://github.com/csvke/panel-chipone-icna3512/blob/master/reference/video_120HZ_DSC%E4%BB%A3%E7%A0%81/20240620_ICNA3512_GVO_G1700_1080x1920_12bit_befor_OP1_V03_GammaRetune_90_120Hz_HDR_10bitDSC.txt)
- [Gamescope AYANEO 3 OLED display pull request](https://github.com/ValveSoftware/gamescope/pull/2347)
- [AYN Odin 2 Portal firmware notes](https://github.com/ChimeraGaming/AYN-OTA-Changelogs/blob/main/Odin_2.md)
- [Valve Galileo Mura extractor](https://gitlab.com/evlaV/galileo-mura-extractor)
- [MuraDeck](https://github.com/Moonveil-Kanata/MuraDeck)
- [Linux LT7911EXC bridge driver patch](https://lkml.iu.edu/hypermail/linux/kernel/2604.3/08913.html)

### Performance

| Feature   | SteamOS | Bazzite | CachyOS |
| --------- | ------- | ------- | ------- |
| VRAM Size | ✅      | ✅      | ✅      |

VRAM Size reserves 4 to 8 GB of system memory for the integrated GPU, matching the range in the Zotac launcher on Windows. Higher values leave less memory for games and SteamOS. Changes take effect after a reboot; until then, the panel shows the active and pending sizes. A BIOS reset, which can happen after a full battery drain, restores the 4 GB default.

#### Native performance controls

The optional bridge adds profiles to Steam's native Performance QAM: Low Power
at 8 W, Balanced at 15 W, Performance at 28 W, and Custom with an 8 to 28 W
slider in 1 W steps. The TDP slider appears only in Custom. These limits use
the inspected ONE Launcher preset wattages; CPU boost, GPU clocks, CPU governors
and fan settings stay unchanged. This is community support from DeckyZone.

The bridge requires a ZONE G0A1W with BIOS 1.20, Ryzen 7 8840U, SteamOS and
SteamOS Manager package `26.4.1-2`. It was tested on SteamOS 3.9.1 and 3.9.2.
A different Manager version stops further bridge writes until it is validated.
It uses RyzenAdj because this BIOS exposes no kernel power attributes.

Installation is separate from a normal DeckyZone update. Once installed,
**Performance → Native Performance Controls** controls the service and startup
at boot. Disable PowerControl and SimpleDeckyTDP in Decky settings before
enabling it; turning off their TDP switches is insufficient. Enabling either
plugin later turns native controls off and blocks the toggle, even with the
panel closed. After disabling the other plugin, turn native controls back on.
Installed but disabled plugins do not block it. Keep other TDP writers disabled.

Steam saves per-game selections. Keep DeckyZone loaded so it can restore the
saved TDP after switching to Custom. Resume and charger changes reapply the
selected limits. Turning off Custom's TDP switch can request the maximum 28 W.
Stopping or removing the bridge leaves the last applied limits in place.

<details>
<summary>Manual bridge setup and removal</summary>

Use a verified bridge payload containing `services/` and `vendor/dbus_next/`
(dbus-next 0.2.3). The installer requires root and the tested RyzenAdj 0.18.0
binary at `/home/deck/homebrew/plugins/PowerControl/bin/ryzenadj`. PowerControl
must be disabled. The installer checks the binary's hash and copies it into the
bridge's own runtime directory. From the payload directory:

```sh
sudo python3 -m services.performance_bridge.install install --enable
```

Installation starts `deckyzone-performance.service`, reloads the D-Bus policy
and restarts the system and user SteamOS Manager services. It preserves the
packaged device configuration and refuses to overwrite existing integration
files. State, the original configuration and file hashes are stored under
`/var/lib/deckyzone-performance/`.

To inspect capabilities without changing settings:

```sh
cd /var/lib/deckyzone-performance
sudo python3 -m services.performance_bridge probe
```

To remove the integration and restore the stock Manager configuration:

```sh
cd /var/lib/deckyzone-performance
sudo python3 -m services.performance_bridge.install rollback --enable
```

Removal preserves saved state and audit files. It refuses to remove integration
files changed since installation. It remains available on an unsupported OS or
Manager version.

The bridge reports the last SMU-acknowledged request, not measured power. A
command failure stops the bridge without retrying or undoing partial writes.
The 28 W preset was acknowledged but has not been measured under sustained load.

</details>

### Fan control

Fan control has its own settings page and quick-access tab. Choose System Auto
to let the device control the fan, or select a saved curve. System Auto is the
default. Custom curves apply to all games; there are no per-game fan profiles.
The quick-access graph shows the active curve and current fan setting.

Under Custom curves, create, rename, duplicate or delete up to 16 saved curves.
You can edit them while System Auto or another curve is active. Drag graph
points or use the point buttons and temperature/speed sliders. Save curve
stores your edits without activating the curve. Save and apply updates the
active curve immediately. Cancel discards your edits. Deleting the active curve
returns the fan to System Auto.

Import from PowerControl lists the saved curves it finds. Importing keeps their
names, adding a number if a name is already used. Your active profile, existing
curves and PowerControl settings stay unchanged. Fixed-speed profiles are not
imported. Older single-curve settings migrate automatically with the same mode,
points and name; the original file is backed up as `fan-control.v1.json`.

Custom fan control requires the ZONE G0A1W's existing `zotac_platform` fan and
`k10temp` CPU sensor, systemd, and the system `dbus-next` Python package. It does
not require the native TDP bridge. Disable PowerControl and SimpleDeckyTDP in
Decky settings before selecting a curve. Enabling either plugin returns the
fan to System Auto. After disabling it, select your curve again to resume fan
control. You can still edit saved curves while either plugin is enabled.
If a disabled plugin left the fan in manual mode, use Restore System Auto.

DeckyZone checks the temperature every second and calculates fan speed between
the curve's points. It requests at least 10% fan speed and 100% at 95°C. The fan
returns to System Auto if a sensor or fan control fails, when the plugin unloads,
at shutdown, and before suspend. Your curve resumes after wake; normal plugin
and device restarts preserve your selection. After a failure, select the curve
again to restart fan control. CPU boost, TDP, GPU clocks, CPU governors and other
plugins' settings stay unchanged.

The editor is adapted from [PowerControl](https://github.com/mengmeet/PowerControl)
under its BSD 3-Clause license; its copyright and license are included in LICENSE.

## Compatibility notes

If controller settings stop responding, use **Troubleshooting > Reapply Controller Profile** to reload dials, trackpads and Home, including active game overrides. This keeps saved settings and also works with untouched defaults. Controller input may pause briefly while the profile is reapplied.

On SteamOS, **Troubleshooting > InputPlumber Update** lets you manually check for and install the latest stable upstream release. It installs the binary and matching controller configurations beside the SteamOS package. **Restore SteamOS InputPlumber** switches back to the version currently included with your OS. Controls pause during either action; saved DeckyZone settings are kept. SteamOS updates may reset this override, so check the active version after a system update. Bazzite and CachyOS use their distribution's packages and do not show this updater. The optional installation stays in place when DeckyZone is reset or removed; restore the SteamOS InputPlumber version first if you want to undo it.

Controller features require InputPlumber and drivers for the ZONE's input devices. Compatibility on other distributions depends on the InputPlumber version and drivers they include. Unloading the plugin restores the previous controller emulation.

DeckyZone bundles `dbus-next` 0.2.3 for the controller mapping worker. Its unmodified Python source, MIT license and upstream checksums are included in [`py_modules/dbus_next`](./py_modules/dbus_next). Both release and pull request builds verify the bundled files and import them without system Python packages.

## Related plugins

- [PowerControl](https://github.com/mengmeet/PowerControl) for TDP and fan control.
- [HueSync](https://github.com/honjow/HueSync) for RGB lighting.

## Feedback

Open an issue to report a bug, request a feature or share feedback.

Join the Discord server for discussion:

- https://discord.gg/dyMMQNKdMH

## Future ideas

These are ideas, not promised features.

### Display

- Startup movie(s)

### Troubleshooting / tips & tricks

- Camera detected status
- Battery warning to help prevent BIOS reset

## Releases

Start **Actions > Release > Run workflow** on `main`. Choose `patch` (the default), `minor` or `major`. The workflow calculates the next version; the first patch release after `0.6.0` is `0.6.1`. Leave the local package version unchanged and let the workflow create the version commit and tag.

The workflow uses the pinned pnpm version and a frozen lockfile. It builds the plugin and validates `DeckyZone.zip` and `DeckyZone.tar.gz` before committing the version change to `main` and pushing the matching stable `vX.Y.Z` tag. It then creates a draft release, uploads both archives and validates the uploaded assets before publishing. Publication keeps the draft's release ID and retries reads when GitHub has not yet exposed the updated metadata.

Release notes come from Conventional Commits through [cliff.toml](./cliff.toml). They contain dated headings, scopes and contributor credits when GitHub metadata is available, grouped into Features, Fixes, Documentation, Performance and Maintenance. Release commits, version bumps, dependency updates and non-conventional messages are omitted. CI and build changes appear under Maintenance, including `feat(ci)`, `fix(ci)`, `feat(build)` and `fix(build)`.

If publishing fails, use **Re-run failed jobs** on the original run. The publish job reuses its saved version, notes and archives. A fresh **Run workflow** calculates another version; **Re-run all jobs** can collide with a version commit or tag that the original run already created. When a matching release is already published, its existing release notes are preserved.

## Credits

Inspired by:

- [Legion Go Remapper](https://github.com/aarron-lee/LegionGoRemapper)
- [HueSync](https://github.com/honjow/HueSync)
- [PowerControl](https://github.com/mengmeet/PowerControl)
- [DeckyPlumber](https://github.com/aarron-lee/DeckyPlumber)
- [OpenZone](https://github.com/OpenZotacZone/ZotacZone-Drivers)
