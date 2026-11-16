# DeckyZone

[![](https://img.shields.io/github/downloads/DeckFilter/DeckyZone/total.svg)](https://github.com/DeckFilter/DeckyZone/releases)
[![](https://img.shields.io/github/downloads/DeckFilter/DeckyZone/latest/total)](https://github.com/DeckFilter/DeckyZone/releases/latest)
[![](https://img.shields.io/github/v/release/DeckFilter/DeckyZone)](https://github.com/DeckFilter/DeckyZone/releases/latest)

DeckyZone is a Decky Loader plugin for the Zotac Gaming Zone. It adds custom controller mappings, display fixes and hardware settings.

![DeckyZone settings](./img/DeckyZone.jpg)

## Features

- Global and per-game dial and trackpad mappings, plus a configurable Home button.
- Custom rumble strength and per-game Xbox controller simulation.
- Zotac controller artwork and hiding unsupported Steam Input controls.
- Zotac OLED display profile and green tint compensation.
- SteamOS battery time estimate fix.
- VRAM size selection (4–8 GB).
- Native Steam performance profiles and an 8–30 W TDP slider through SteamOS Manager.
- Global CPU boost toggle through SteamOS Manager.
- Global fan control: System Auto, Manual or Curve, with PowerControl curve import.

## Installation

Install [Decky Loader](https://github.com/SteamDeckHomebrew/decky-loader#-installation) first, then run this command in a terminal in Desktop Mode:

```bash
curl -L https://raw.githubusercontent.com/DeckFilter/DeckyZone/main/install.sh | sh
```

Check for updates in **General > Software Updates**, or read the [release notes](https://github.com/DeckFilter/DeckyZone/releases). **Update Channel**, under **Beta Participation**, defaults to **Stable**. Choose **Pre-release** to try preview builds. Switching back offers the stable version and keeps saved settings.

## Performance profiles

Enable **Performance > Native Performance Controls** in DeckyZone to add these profiles to Steam's Performance menu:

| Profile     | Power limit           |
| ----------- | --------------------- |
| Low Power   | 8 W                   |
| Balanced    | 15 W                  |
| Performance | 28 W                  |
| Custom      | 8–30 W (20 W default) |

## Compatibility and troubleshooting

I test and develop DeckyZone on SteamOS. Bazzite and CachyOS compatibility is based on user reports.

Controller features require InputPlumber and drivers for the ZONE's input devices.

Native performance controls check SteamOS Manager's installed features rather than the distribution name or package version. Manager must support remote performance providers and device configuration overrides, with compatible ZONE configuration and working system and user services. Enabling the controls also verifies that Manager exposes them to Steam.

The hardware requirements remain a ZONE G0A1W with BIOS 1.20 and a Ryzen 7 8840U, with no active native platform-profile driver or competing power writer. Other distributions can qualify when these checks pass; native performance controls have not been tested on Bazzite or Nobara.

CPU Boost separately requires Manager's CPU boost interface.

Disable PowerControl and SimpleDeckyTDP in Decky settings before using native controls, CPU boost or Manual/Curve fan mode.

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
