# DeckyZone

DeckyZone is a Decky plugin for the Zotac Gaming Zone that aims to bridge the most common compatibility gaps until full compatibility lands. It focuses on practical fixes and workarounds for the problems you are most likely to run into today.

## Current Features

- Enable the controller behavior DeckyZone manages
- Enable the Home button
- Enable the dials, including brightness on the right dial
- Improve rumble setup and testing
- Fix button prompts and glyphs in games
- Optionally disable trackpads while that fix is active

## Installation

Run the following in terminal:

```bash
curl -L https://raw.githubusercontent.com/felixhirschfeld/DeckyZone/main/install.sh | sh
```

## Compatibility

- Confirmed working on the latest SteamOS `main`
- Intended to work on distros with InputPlumber integrated, such as Nobara and CachyOS, but not tested yet
- Bazzite/HHD compatibility is a target, but not confirmed yet

## Status

Feedback is really appreciated. Please open an issue if you have feedback, bugs, or feature requests.

If you would like to talk directly, you can also join the Discord server:

- https://discord.gg/dyMMQNKdMH

## Future Ideas

These are ideas, not promised features.

### Display

- HDR / Washed out colors fix (is working out of the box in latest SteamOS but still not on stable)
- Green tint fix
- Zotac Zone glyphs and images
- Startup movie(s)

### TDP

- Maybe via `"PowerControl"` or built-in
- Per-game profiles
- Per-AC mode behavior
- Separate defaults for SteamUI and games
- Presets and custom profiles

### RGB

- Maybe via `"HueSync"` or built-in

### Fans

- Maybe via a third-party plugin or built-in

### Troubleshooting / Tips & Tricks

- Camera detected status
- System info with EC and display firmware
- Model and board name details
- Battery warning to help prevent BIOS reset

## Credits

Projects currently inspiring DeckyZone:

- `Decky Loader`
- `Decky Plugin Template`
- `Legion Go Remapper`
- `HueSync`
- `PowerControl`
