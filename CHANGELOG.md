# Changelog

## [0.6.1] - 2026-10-09


### 🚀 Features

- Open updates from notification by @felixhirschfeld
- Add controller profile recovery action (#41) by @felixhirschfeld



### 🐛 Fixes

- Bundle controller mapping dependency (#46) by @felixhirschfeld



### 🛠️ Maintenance

- Automate manual releases and formatted changelogs by @felixhirschfeld


## [0.6.0] - 2026-10-06


### 🚀 Features

- Add Zotac launch animations and fix hidden controls (#39) by @felixhirschfeld
- Add custom controller mappings (#40) by @felixhirschfeld



### 📚 Documentation

- Fix readme by @felixhirschfeld


## [0.5.1] - 2026-09-21


### 🐛 Fixes

- Recover from stalled backend bootstrap (#33) by @felixhirschfeld
- Treat uninitialized CMOS VRAM as default by @felixhirschfeld
- Clear restart requirement after reverted changes by @felixhirschfeld



### 🛠️ Maintenance

- Move VRAM fixes into pull request by @felixhirschfeld
- Fix Decky stub version by @felixhirschfeld


## [0.5.0] - 2026-09-16


### 🚀 Features

- Implement VRAM size control (#8) by @ti-ro
- Add SteamOS-style restart dialog by @felixhirschfeld
- Refine Zotac Zone controller glyphs (#28) by @felixhirschfeld
- Add startup update toast (#29) by @felixhirschfeld



### 📚 Documentation

- Mark Zotac Glyphs working on Bazzite


## [0.4.0] - 2026-05-07


### 🚀 Features

- Add gyro orientation fix toggle



### 🛠️ Maintenance

- Move gyro orientation fix to end of controller section


## [0.3.1] - 2026-04-27


### 🐛 Fixes

- Remove steam input disabled toast
- Package gamescope display assets
- Clear recovered controller status
- Prevent unload timeout


## [0.3.0] - 2026-04-21


### 🚀 Features

- Use toasts for feedback
- Global disable trackpads
- Add trackpad modes with  directional button remap
- Share rumble and trackpad controls across global and per-game settings
- Add troubleshooting reset cleanup



### 🐛 Fixes

- Improve rumble slider feedback and save reliability
- Dropdown state
- Restore inputplumberAvailable
- Dialog padding
- Restore default trackpad mode.
- Refresh UI after plugin reset
- Clear dependent controller toggles



### 📚 Documentation

- Update README for 0.3.0 features



### 🛠️ Maintenance

- Use toast logo and shorten toast copy
- Replace zotac button glyphs with svgs


## [0.2.1] - 2026-04-09


### 🚀 Features

- Use zotac shoulder glyphs
- Add per-game m1 and m2 remaps when steam input is disabled
- Expand debug dialog



### 🐛 Fixes

- Debug dialog
- Verify startup gamepad device before marking applied
- Remove automatic rumble preview
- Retry startup until inputplumber runtime is ready
- Streamline debug info dialog and resize zotac shoulder glyphs
- Separate home button override from per-game remap profile
- Make controller mode read-only with gamepad recovery



### 📚 Documentation

- Update readme



### 🛠️ Maintenance

- Replace upstream glyph asset prefix
- Sync decky stub version with package json
- Hide m1 m2 remap unti validation


## [0.2.0] - 2026-04-02


### 🚀 Features

- Add Zotac Gamescope display fixes
- Add system info header popup
- Use zotac logo for plugin icon
- Add extended update panel
- Controller mode dropdown
- Add zotac glyphs toggle
- Use zotac png assets for guide and menu glyphs



### 🐛 Fixes

- Handle null release assets in installers
- Follow github redirects in installer after repo transfer
- Broken color profile toggle
- Polish copy



### 📚 Documentation

- Update readme



### 🛠️ Maintenance

- Add TODO for display toggle race hardening
- Update repository URLs
- Isolate panels behind error boundaries and harden plugin load
- Split tests by subsystem and reduce brittle frontend assertions
- Simplify error boundary
- Split controller sub-panels
- Types and comonents
- Clean up ui and restructur stuff
- Remove test suite
- Rollback package.json to 0.2.0
- Remove reset all


## [0.1.3] - 2026-03-27


### 🐛 Fixes

- Preserve prompt-fix target after startup reapply


## [0.1.2] - 2026-03-27


### 📚 Documentation

- Add feature compatibility table to readme



### 🛠️ Maintenance

- Inputplumber target sync helpers


## [0.1.1] - 2026-03-27


### 🐛 Fixes

- Gate inputplumber-dependent controls when unavailable



### 📚 Documentation

- Add release badges to readme


## [0.1.0] - 2026-03-27


### 📚 Documentation

- Update readme
- Add readme badge and screenshot



### 🛠️ Maintenance

- Update readme and metadata
- Update license and feedback links


## [0.0.2] - 2026-03-27


### 🚀 Features

- Add retry for ota



### 🐛 Fixes

- Make ota reinstall safe during failed installs



### 🛠️ Maintenance

- Simplify copy
- Gate home and brightness toggles on controller


## [0.0.1] - 2026-03-27


### 🚀 Features

- Add DeckyZone startup mode reapply for Zotac Zone
- Add rumble intensity
- Add per-game missing glyph fix toggle
- Add per-game trackpad toggle for missing glyph fix
- Add brightness dials
- Refine controller labels and Steam Input note
- Add ota updates section



### 🐛 Fixes

- Use InputPlumber force feedback for test rumble
- Switch DeckyZone startup target from xbox-elite to deck-uhid
- Load per-game settings at startup and gate UI on initial settings load
- Home button



### 📚 Documentation

- Update readme



### 🛠️ Maintenance

- Add release workflow and installer
- Change to toggle
- Copy


<!-- generated by git-cliff -->
