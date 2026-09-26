# PowerControl coexistence experiment, 26 September 2026

The user requested a test with their existing PowerControl running alongside the
native performance bridge. A separate modified fan-only build was considered
and discarded before deployment at the user's direction. PowerControl's code
was not changed, replaced, or reloaded for this experiment.

## Test configuration

- PowerControl 3.15.1 stays enabled with the user's existing Default fan curve.
- A bridge-only change accepts an explicit, root-owned, temporary marker at
  `/run/deckyzone-powercontrol-coexistence-test`. It bypasses only the enabled
  PowerControl check, without claiming fan-only operation or exclusive ownership.
- Reboot removes the marker. Removing it earlier restores the normal guard on
  the next request or approximately one-second monitor check.
- SimpleDeckyTDP and known competing-process checks remain active.
- The original bridge module and PowerControl settings were backed up under
  `/home/deck/homebrew/plugin-backups/DeckyZone.coexistence-test-20260926-063112`.

44 targeted tests passed, covering the existing bridge behavior, marker content,
ownership and permissions, the unchanged SimpleDeckyTDP block, and rejection of
the next power write after the override is removed. The standalone service ZIP
passed integrity and source-content checks. No frontend change is required.

## Missing installation files on this boot

The device reported SteamOS 3.9.2 and SteamOS Manager 26.4.1-2. Five integration
files were missing: the adapted device configuration, opt-in marker, user
Manager drop-in, D-Bus policy, and remote-provider descriptor. The system
Manager drop-in and bridge unit still existed. The absent configuration caused
the system Manager to fail startup, while the user Manager repeatedly failed
to connect. The logs do not establish what removed those files.

All five missing files were reconstructed from the retained installation data
and matched the original installation manifest hashes exactly. Existing files
were checked and preserved. Restarting the recovered Managers then allowed the
bridge to start. System Manager, user Manager, bridge, and PowerControl RPCs all
responded successfully. Decky Loader retained PID 1979; bridge PID was 9795.
PowerControl's main.py, frontend bundle, package metadata, and settings hashes
were unchanged across the bridge deployment and initial activation.

## Game launch and observed interference

The saved per-game profile for Steam app 292030, The Witcher 3: Wild Hunt, had
TDP enabled at 15 W, CPU boost disabled, and the Default fan curve selected.

- At 06:36:18 CEST, PowerControl logged switching to app 292030, followed by a
  15 W request. CPU boost changed from 1 at Steam Home to 0 while loading.
- At 06:37:06, PowerControl requested unlimited TDP, using its 30 W maximum.
  The user confirmed turning off the per-game TDP toggle and then disabling
  that leftover per-game profile. These were user actions, not an unexplained
  automatic toggle. CPU boost subsequently returned to 1.
- PowerControl reported failures for its TDP command attempts. These messages
  do not prove that no limits were applied: subsequent package-energy samples
  reached approximately 30 W while the bridge still reported its last
  acknowledged Low Power / 8 W selection.
- During the 06:38:42–06:39:47 observation, the bridge stayed active and its saved
  selection remained 8 W. The final package sample was 30.00 W. PowerControl's
  fan curve remained active, reaching about 3,717 RPM at an 87 C reported fan
  temperature. This was the user's game load, not a synthetic stress test.

The coexistence override allows both processes to run. It does not prevent
PowerControl's writes from superseding a native selection, and the bridge's
acknowledged-request state cannot detect every external change to hardware.

## Native menu check

The user reported missing/nonworking native controls. The rendered Performance
QAM had no performance-profile or TDP rows. The provider and user Manager both
exposed all four profiles over D-Bus, but Steam's own `SteamOSService.GetState`
returned an empty profile list and unavailable manual GPU/TDP capabilities.
Steam's UI cache matched that empty state, so this was not just a stale rendered
panel.

At the user's request, DeckyZone's own `set_native_performance_enabled` RPC was
called with false and then true. Both calls succeeded and the status confirmed
the service stopped and restarted, but Steam still returned empty capabilities.
After the user closed the game and authorized restarting Steam, its native
`StartRestart(false)` action was invoked. The next `SteamOSService.GetState`
and UI cache both contained all four profiles and the 800–2700 MHz manual GPU
range. Low Power was selected, so TDP availability was correctly false pending
selection of Custom. PowerControl remained enabled, its three code hashes
still matched the baseline, and its fan curve was active. Decky Loader retained
PID 1979; the bridge's toggle gave it PID 14473.

The restored Manager interfaces were therefore sufficient after Steam restarted.
Toggling the provider alone did not refresh this already-running Steam client's
empty capability state.

The user then confirmed Custom and the TDP slider worked and completed the
requested 12 W / 15 W check at Steam Home. The bridge logged successful SMU
acknowledgements for 12 W at 06:48:55 and 15 W at 06:49:18. A 65-second capture
recorded those saved selections, an active bridge throughout, CPU boost still
enabled, and PowerControl's manual fan curve continuing to adjust PWM and RPM.
No PowerControl TDP or boost writes appeared during this capture. Steam's live
state and UI cache both exposed TDP limits of 8–28 W, and its settings finished
at Custom / 15 W. The final package-energy sample was 3.08 W at the menu, so this
check proves request delivery and concurrent fan operation, not enforcement
under a sustained game load. A second 65-second capture ended at 06:51:38 with
Custom / 15 W still selected, the fan curve active, and no competing TDP writes.
No game-launch event appeared in that capture. A fresh game-launch check is
pending the user starting the game.

## Continued game test

On the next check, both services were active with unchanged code hashes. Steam
initially selected Low Power. PowerControl's Witcher 3 profile was enabled
again, with its TDP toggle off and stored CPU boost preference off. The global
TDP toggle was also off. These settings were read, not changed by the test.

PowerControl logged the app switch to 292030 at 06:55:12 and handled TDP with
both the current and previous enable flags false, without issuing a TDP write.
The bridge acknowledged Custom / 15 W at 06:55:26. The user reported the game
was still loading. From 06:55:42 through 06:56:47, package power stayed between
14.94 and 15.05 W (median 15.00 W), while the acknowledged selection remained
15 W. PowerControl's fan stayed in manual mode and adjusted from 2,639 to
2,069 RPM as the reported temperature fell from 74 C to 66 C. CPU boost read
1 throughout that capture; the stored per-game preference alone did not prove
the active boost state. No competing TDP writes appeared in this window.

This demonstrates a sustained 15 W limit under this loading workload with fan
control running concurrently. The launch itself occurred before the 15 W
selection, so this does not yet prove a pre-existing 15 W selection survives a
game transition.

The user confirmed gameplay and clarified their intended setup: Custom / 20 W,
with CPU boost enabled again through PowerControl. They explained their
per-game profile switches are tied together. Those setting changes must not be
classified as unexplained automated interference.

At 06:58:02, Steam's settings reported Custom / 20 W with TDP enabled, but the
Manager's actual TdpLimit property and the bridge's saved selection remained
15 W. A second capture, 06:57:38–06:58:43, measured 14.94–15.07 W (median 15 W)
with CPU boost enabled. No 20 W request had reached the bridge. This is a
confirmed UI/request mismatch; its cause is not established and must not be
attributed to PowerControl merely because both plugins were enabled.

At the requested manual 19 W → 20 W slider check, both values were acknowledged
by the bridge at 06:58:49. The Manager then reported 20 W. A direct slider
change therefore restored agreement; automatic profile restoration needs a
separate transition test.

During confirmed gameplay from 06:58:52 to 06:59:57, the saved selection remained
Custom / 20 W and CPU boost stayed enabled. The final 30 one-second package
samples measured 19.98–20.03 W (median 20.00 W). The fan remained in manual mode,
increasing from 2,308 to 2,750 RPM as its reported temperature rose from 71 C to
75 C. No competing TDP writes appeared. This verifies the requested 20 W limit
and PowerControl fan operation concurrently for this gameplay window.

A further gameplay capture at 07:00:58–07:02:03 measured 19.97–20.04 W (median
20 W), with CPU boost enabled and the fan around 2,757 RPM at 76 C. No profile
transition or competing TDP write occurred in that window. The user was asked
to save and exit for the next transition check.

The user confirmed closing the game. At 07:03:58, the bridge first acknowledged
Custom / 15 W, then Low Power / 8 W. Steam's settings returned to Low Power
with its saved custom value of 15 W; Manager reported Low Power and correctly
withdrew TDP availability. PowerControl logged the switch from app 292030 to 0
with both TDP enable flags false and no TDP write. The exit transition therefore
restored the Home preset successfully, while also replacing the bridge's global
saved custom value with Home's 15 W.

The user relaunched without changing settings. PowerControl logged app 292030
at 07:05:25, again with TDP disabled and no TDP write. At 07:05:39 the bridge
acknowledged Custom / 15 W, while Steam's settings showed Custom / 20 W. The
sample immediately after restoration measured 14.86 W. The mismatch therefore
reproduces on an automatic game transition.

Steam's own `steamui_steamos.txt` explains the order: on exit it commits 15 W
before selecting Low Power; on relaunch it commits 20 W before selecting Custom.
At the latter moment the TDP interface is absent. The bridge receives the
subsequent Custom selection and restores its remembered 15 W, without receiving
the earlier 20 W update. The 15 W is therefore the bridge's retained Home value,
not a PowerControl TDP write in this transition. A narrow D-Bus capture ended
nine seconds before the game switch and cannot be used as wire-level proof of
the missing request; the conclusion uses Steam's ordered log, bridge log and
state, and measured package power.

Automatic restoration across a preset-to-Custom transition is not passing.
The bridge integration needs to reconcile Steam's saved TDP after Custom is
available, while preserving one owner and avoiding repeated hardware writes.
This should be addressed separately from PowerControl's existing fan behavior.

After recording the failure, the user's intended 20 W was restored through
SteamOS Manager's native TdpLimit property. The action first required Custom
and an unchanged 15/20 W selection, then verified Manager reported 20 W. This
was a manual test recovery, not a fix for automatic restoration. PowerControl
code and settings were not modified.

## Restoration fix and deployment

The fix adds a DeckyZone frontend listener for Steam settings and Manager
capability changes. It waits for Custom's TDP interface and this bridge to be
active, then replays Steam's current TDP setting through the same setter used by
the native QAM. Steam still owns the per-game settings. There is no second
profile database, slider replacement, or PowerControl patch. Ordinary slider
changes do not trigger replays; stale requests and plugin unload invalidate
pending work. Readiness reads are bounded and uncertain writes are not retried.

The local reuse points are `NativePerformanceControl.tsx`'s bridge-status RPC
and `index.tsx`'s frontend lifecycle cleanup. The new listener uses the inspected
Steam settings and notification contracts, found by exported API shape rather
than hardcoded webpack module numbers. A live pre-deploy smoke check verified
that replaying an unchanged native setting sends an actual TdpLimit D-Bus Set.

Seven temporary focused checks passed for delayed availability, duplicate
events, stale values, unload, inactive/starting service, failed writes, invalid
bounds, and preserving the TDP-off choice. Type checking with `--skipLibCheck`
and the production build passed. Plain `tsc` remains blocked by the existing
missing `react-router` declaration in `@decky/api`, outside this change.

Only `dist/index.js` was replaced after verifying the old and new hashes and
saving a backup at
`/home/deck/homebrew/plugin-backups/DeckyZone.native-restore-20260926-072532`.
DeckyZone's frontend alone was reloaded; PowerControl retained the same frontend
object, all three code hashes, and its active fan curve. Decky Loader PID 1979
and bridge PID 14473 were unchanged. Installed bundle SHA-256:
`bce087d5f15b6ae652a984b2d084c6a74d90e197b223eaf9d4769cd346e82e73`.

The user relaunched without touching performance settings. At 07:28:05 the
bridge acknowledged Custom / 15 W followed by Custom / 20 W in the same second.
Steam's settings remained Custom / 20 W. PowerControl's app-switch handler
reported TDP off and made no TDP write. The previously failing automatic
restoration now passes this launch check; sustained and return-transition
verification follows below.

The D-Bus capture recorded PerformanceProfile=custom at 07:28:05.116, followed
by exactly one TdpLimit=20 request at 07:28:05.490. The 374 ms gap confirms the
saved value is sent after the profile change rather than lost before it.
From 07:28:10 to 07:29:15 the saved selection stayed at 20 W with boost enabled
and manual fan control active. Package power varied with the loading workload
between 4.77 and 20.03 W and ended at 19.98 W. The fan adjusted from 1,780 to
2,281 RPM as the reported temperature rose from 57 C to 65 C. No competing TDP
writes or repeated restoration writes occurred during that capture.

After the user saved and closed the game, the bridge acknowledged Low Power /
8 W at 07:29:32. PowerControl recorded the return to app 0 at 07:29:33 with
both TDP enable flags false and no TDP write. At 07:30:17, Steam still reported
Low Power, its saved custom value was 15 W, and TDP availability was correctly
hidden. The bridge remained active and available; PowerControl's fan readback
was 1,406 RPM at about 52 C. No delayed 20 W replay appeared in the bridge log
during the 45 seconds after exit. The tested Home Low Power / 8 W → game Custom
/ 20 W → Home Low Power / 8 W sequence therefore passes with PowerControl
enabled and its fan control active.

This session has not included a controlled PowerControl-disabled comparison.
The missed request is explained by the observed native request order and
bridge availability, but PowerControl's possible effect on profile-switch
timing has not been separately isolated. Its earlier 30 W reset when the user
turned its TDP toggle off remains a distinct, observed coexistence risk.
