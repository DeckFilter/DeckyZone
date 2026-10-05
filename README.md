# DeckyZone

[![Downloads](https://img.shields.io/github/downloads/DeckFilter/DeckyZone/total.svg)](https://github.com/DeckFilter/DeckyZone/releases)
[![Version](https://img.shields.io/github/v/release/DeckFilter/DeckyZone)](https://github.com/DeckFilter/DeckyZone/releases/latest)

DeckyZone is a Decky Loader plugin for the Zotac Gaming Zone. It adds custom controller mappings, display fixes and hardware settings.

![DeckyZone settings](./img/DeckyZone.jpg)

## Features

- Global and per-game dial and trackpad mappings, plus a configurable Home button.
- Custom rumble strength and per-game Xbox controller simulation.
- Zotac controller artwork and hiding unsupported Steam Input controls.
- Zotac OLED display profile and green tint compensation.
- SteamOS battery time estimate fix.
- VRAM size selection (4–8 GB).
- Native Steam performance profiles and TDP controls.
- Global fan control with custom curves.

## Installation

Install [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader#-installation) first, then run this command in a terminal in Desktop Mode:

```bash
curl -L https://raw.githubusercontent.com/DeckFilter/DeckyZone/main/install.sh | sh
```

Check for updates in **General > Software Updates**, or read the [release notes](https://github.com/DeckFilter/DeckyZone/releases). **Update Channel**, under **Beta Participation**, defaults to **Stable**. Choose **Pre-release** to try preview builds. Switching back offers the stable version and keeps saved settings.

## Native performance controls

Turn on **Performance > Native Performance Controls** in DeckyZone to add profiles to Steam's Performance menu:

| Profile     | Power limit |
| ----------- | ----------- |
| Low Power   | 8 W         |
| Balanced    | 15 W        |
| Performance | 28 W        |
| Custom      | 8 to 28 W   |

The TDP slider appears only in Custom. Steam saves per-game selections; keep DeckyZone loaded to restore them. These presets use ONE Launcher's wattages and leave CPU boost, GPU clocks and fan settings unchanged.

Setup installs the required files and can repair them after a SteamOS update. If the controls do not appear, use DeckyZone's **Restart Steam** option.

DeckyZone currently supports native controls on SteamOS with a ZONE G0A1W, BIOS 1.20, Ryzen 7 8840U and SteamOS Manager `26.4.0` or newer. It checks compatibility before enabling the controls. Bazzite and CachyOS support still needs implementation and device testing.

Turning off Custom's TDP limit can request 28 W. Disabling or removing native controls leaves the last power limit in place.

<details>
<summary>Bridge diagnostics and removal</summary>

Inspect support without changing settings:

```sh
cd /var/lib/deckyzone-performance
sudo python3 -m services.performance_bridge probe
```

Remove native performance support and restore the system configuration:

```sh
cd /var/lib/deckyzone-performance
sudo python3 -m services.performance_bridge.install rollback --enable
```

</details>

## Fan control

Open **Fan control** and choose a mode: **System Auto** lets the device control the fan, **Manual** holds a chosen speed, and **Curve** follows a saved curve. System Auto is the default. Fan settings apply to all games.

In Curve mode, select a saved curve on the main screen. The graph shows the active curve. Open **Manage curves** to add, edit, duplicate, delete or import curves from PowerControl. Saving an active curve applies its changes; saving other curves leaves the current mode unchanged. Imports preserve PowerControl's settings and skip fixed-speed profiles. Deleting the active curve returns to System Auto.

The included **Default** curve uses ONE Launcher's curve points. You can edit it or add your own curves.

Manual and Curve use at least 10% fan speed and reach 100% at 95°C. The fan returns to System Auto if control fails, before sleep and when DeckyZone unloads. Your selected mode resumes after wake. Use **Restore System Auto** if another plugin left the fan in manual mode.

Fan control works without native performance controls. It requires the G0A1W's `zotac_platform` fan driver, `k10temp` sensor, systemd and `dbus-next`.

## Compatibility and troubleshooting

I test and develop DeckyZone on SteamOS. Bazzite and CachyOS compatibility is based on user reports.

Controller features require InputPlumber and drivers for the ZONE's input devices.

Disable PowerControl and SimpleDeckyTDP in Decky settings before using native performance controls or Manual or Curve fan mode. Turning off their TDP switches is insufficient. Enabling either plugin turns native controls off and returns the fan to System Auto. After disabling it, re-enable native controls or select your fan mode again. Installed but disabled plugins do not block these features.

- The battery time estimate fix is available only on SteamOS.
- Green Tint Compensation may not correct green tint at low brightness.

If controller input stops responding, try **Troubleshooting > Reapply Controller Profile**. It reloads the controller configuration without deleting saved settings.

SteamOS users can update InputPlumber from **Troubleshooting**. The update remains installed after DeckyZone is reset or removed; use **Restore SteamOS InputPlumber** to undo it. SteamOS updates may reset this override. Bazzite and CachyOS use their distribution's packages.

## Support

[Open an issue](https://github.com/DeckFilter/DeckyZone/issues) to report a bug or request a feature, or join [Discord](https://discord.gg/dyMMQNKdMH) for discussion.

## Donations

DeckyZone is free. You can support development through:

[GitHub Sponsors](https://github.com/sponsors/DeckFilter) · [Patreon](https://www.patreon.com/DeckFilter) · [Ko-fi](https://ko-fi.com/deckfilter) · [Buy Me a Coffee](https://www.buymeacoffee.com/deckfilter)

## Credits and references

The following projects provided code references, artwork and inspiration for DeckyZone:

- [Handheld Controller Glyphs](https://github.com/victor-borges/handheld-controller-glyphs)
- [CSS Loader](https://github.com/DeckThemes/SDH-CssLoader)
- [Legion Go Remapper](https://github.com/aarron-lee/LegionGoRemapper)
- [HueSync](https://github.com/honjow/HueSync)
- [PowerControl](https://github.com/mengmeet/PowerControl)
- [DeckyPlumber](https://github.com/aarron-lee/DeckyPlumber)
- [OpenZone](https://github.com/OpenZotacZone/ZotacZone-Drivers)

The fan editor is adapted from PowerControl under its BSD 3-Clause license. Copyright and license details are in LICENSE. For RGB lighting, use HueSync.
