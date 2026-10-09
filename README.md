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

The workflow uses the pinned pnpm version and a frozen lockfile. It builds the plugin and validates `DeckyZone.zip` and `DeckyZone.tar.gz` before committing the version change to `main` and pushing the matching stable `vX.Y.Z` tag. It then creates a draft release, uploads both archives and validates the uploaded assets before publishing.

Release notes come from Conventional Commits through [cliff.toml](./cliff.toml). They contain dated headings, scopes and contributor credits when GitHub metadata is available, grouped into Features, Fixes, Documentation, Performance and Maintenance. Release commits, version bumps, dependency updates and non-conventional messages are omitted. CI and build changes appear under Maintenance, including `feat(ci)`, `fix(ci)`, `feat(build)` and `fix(build)`.

If publishing fails, use **Re-run failed jobs** on the original run. The publish job reuses its saved version, notes and archives. A fresh **Run workflow** calculates another version; **Re-run all jobs** can collide with a version commit or tag that the original run already created. When a matching release is already published, its existing release notes are preserved.

## Credits

Inspired by:

- [Legion Go Remapper](https://github.com/aarron-lee/LegionGoRemapper)
- [HueSync](https://github.com/honjow/HueSync)
- [PowerControl](https://github.com/mengmeet/PowerControl)
- [DeckyPlumber](https://github.com/aarron-lee/DeckyPlumber)
- [OpenZone](https://github.com/OpenZotacZone/ZotacZone-Drivers)
