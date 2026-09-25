import { callable } from '@decky/api'
import { useState } from 'react'
import type { PluginSettings } from '../types/plugin'
import { showRestartRequiredDialog } from '../utils/showRestartRequiredDialog'
import { useDeckyToastNotice } from '../utils/toasts'
import SettingsDialogBodyText from './SettingsDialogBodyText'
import { SteamExplainerToggleField } from './SteamExplainer'
import { SettingsRow, SettingsSection, useSettingsSurface } from './SettingsSurface'

type Props = {
  settings: PluginSettings
  onSettingsChange: (nextSettings: PluginSettings) => void
}

const setGamescopeZotacProfileEnabled = callable<[boolean], PluginSettings>('set_gamescope_zotac_profile_enabled')
const setGamescopeGreenTintFixEnabled = callable<[boolean], PluginSettings>('set_gamescope_green_tint_fix_enabled')

const RESTART_NOTE = 'reboot after changing this'
const DISPLAY_UPDATE_FAILED_NOTICE = "Couldn't update display."
const DISPLAY_MISMATCH_NOTICE = 'Display change did not apply.'
const DISPLAY_VERIFICATION_NOTICE = 'Display profile needs attention.'
const DISPLAY_RESTART_REQUIRED_NOTICE = 'Restart to apply display change.'
const ZOTAC_PROFILE_EXPLAINER =
  'Adds the Zotac OLED Gamescope profile when it is missing.'
const NATIVE_COLOR_TEMPERATURE_HINT =
  'For the most accurate OLED colors, enable Use Native Color Temperature in Steam Settings > Display.'
const LOW_BRIGHTNESS_TINT_NOTE =
  "Green Tint Compensation only changes the OLED profile's white point. It does not correct the separate panel tint observed from 12% through 35% brightness on the author's unit."
const GREEN_TINT_COMMUNITY_NOTE =
  "This white-point adjustment came from the community, but I don't see a noticeable improvement on my unit. It does not correct the brightness-dependent panel tint I observed from 12% through 35%. Owners of other handhelds believed to use the same AMOLED panel have reported similar low-brightness tint, which suggests it may be a panel characteristic."

function getGreenTintDescription(isBaseProfileAvailable: boolean) {
  if (!isBaseProfileAvailable) {
    return `Requires the Zotac OLED profile first, ${RESTART_NOTE}`
  }

  return undefined
}

function getGreenTintExplainer(settings: PluginSettings, isBaseProfileAvailable: boolean) {
  if (!isBaseProfileAvailable) {
    return `Green Tint Compensation requires the Zotac OLED profile. Enable the profile first. ${GREEN_TINT_COMMUNITY_NOTE}`
  }

  const profile = settings.gamescopeZotacProfileBuiltIn
    ? 'built-in Zotac OLED profile'
    : 'Zotac OLED profile'
  return `Adjusts the ${profile}'s white point to reduce its green tint. ${GREEN_TINT_COMMUNITY_NOTE}`
}

function getDisplayVerificationNotice(settings: PluginSettings) {
  if (
    settings.gamescopeZotacProfileVerificationState === 'error' ||
    settings.gamescopeZotacProfileVerificationState === 'unexpected'
  ) {
    return DISPLAY_VERIFICATION_NOTICE
  }

  return null
}

const DisplayPanel = ({ settings, onSettingsChange }: Props) => {
  const surface = useSettingsSurface()
  // TODO: If rapid toggling ever causes stale UI state, serialize these requests
  // or ignore out-of-order responses instead of relying only on disabled toggles
  // and backend file-state readback.
  const [savingZotacProfile, setSavingZotacProfile] = useState(false)
  const [savingGreenTintFix, setSavingGreenTintFix] = useState(false)
  const [displayNotice, setDisplayNotice] = useState<string | null>(null)
  const isBaseProfileAvailable = settings.gamescopeZotacProfileBuiltIn || settings.gamescopeZotacProfileInstalled
  const displayVerificationNotice = getDisplayVerificationNotice(settings)

  useDeckyToastNotice(
    displayNotice
      ? {
          activeKey: `display-action:${displayNotice}`,
          title: 'Display',
          body: displayNotice,
          severity: displayNotice === DISPLAY_UPDATE_FAILED_NOTICE ? 'error' : 'warning',
        }
      : null,
  )

  useDeckyToastNotice(
    displayVerificationNotice
      ? {
          activeKey: `display-verification:${settings.gamescopeZotacProfileVerificationState}`,
          title: 'Display',
          body: displayVerificationNotice,
          severity: 'warning',
        }
      : null,
  )

  const handleZotacProfileChange = async (enabled: boolean) => {
    let restartRequired = false
    setDisplayNotice(null)
    setSavingZotacProfile(true)
    try {
      const nextSettings = await setGamescopeZotacProfileEnabled(enabled)
      onSettingsChange(nextSettings)
      if (nextSettings.gamescopeZotacProfileInstalled !== enabled) {
        setDisplayNotice(DISPLAY_MISMATCH_NOTICE)
      } else if (nextSettings.gamescopeDisplayRestartRequired) {
        restartRequired = true
      }
    } catch {
      setDisplayNotice(DISPLAY_UPDATE_FAILED_NOTICE)
    } finally {
      setSavingZotacProfile(false)
    }

    if (restartRequired) {
      try {
        showRestartRequiredDialog()
      } catch {
        setDisplayNotice(DISPLAY_RESTART_REQUIRED_NOTICE)
      }
    }
  }

  const handleGreenTintFixChange = async (enabled: boolean) => {
    let restartRequired = false
    setDisplayNotice(null)
    setSavingGreenTintFix(true)
    try {
      const nextSettings = await setGamescopeGreenTintFixEnabled(enabled)
      onSettingsChange(nextSettings)
      if (nextSettings.gamescopeGreenTintFixEnabled !== enabled) {
        setDisplayNotice(DISPLAY_MISMATCH_NOTICE)
      } else if (nextSettings.gamescopeDisplayRestartRequired) {
        restartRequired = true
      }
    } catch {
      setDisplayNotice(DISPLAY_UPDATE_FAILED_NOTICE)
    } finally {
      setSavingGreenTintFix(false)
    }

    if (restartRequired) {
      try {
        showRestartRequiredDialog()
      } catch {
        setDisplayNotice(DISPLAY_RESTART_REQUIRED_NOTICE)
      }
    }
  }

  return (
    <>
      {surface === 'settings' && (
        <>
          <SettingsDialogBodyText>{NATIVE_COLOR_TEMPERATURE_HINT}</SettingsDialogBodyText>
          <SettingsDialogBodyText>{LOW_BRIGHTNESS_TINT_NOTE}</SettingsDialogBodyText>
        </>
      )}
      <SettingsSection title="Display" settingsTitle={null}>
        {!settings.gamescopeZotacProfileBuiltIn && (
          <SettingsRow>
            <SteamExplainerToggleField
              label="Enable Zotac OLED Profile"
              explainerTitle="Zotac OLED Profile"
              explainer={ZOTAC_PROFILE_EXPLAINER}
              settingsDescription="Adds the Zotac OLED profile"
              checked={settings.gamescopeZotacProfileInstalled}
              onChange={(value: boolean) => void handleZotacProfileChange(value)}
              disabled={savingZotacProfile}
            />
          </SettingsRow>
        )}
        <SettingsRow>
          <SteamExplainerToggleField
            label="Green Tint Compensation"
            explainerTitle="Green Tint Compensation"
            explainer={getGreenTintExplainer(settings, isBaseProfileAvailable)}
            settingsDescription="Adjusts the OLED profile's white point"
            checked={settings.gamescopeGreenTintFixEnabled}
            onChange={(value: boolean) => void handleGreenTintFixChange(value)}
            disabled={savingGreenTintFix || !isBaseProfileAvailable}
            description={getGreenTintDescription(isBaseProfileAvailable)}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

export default DisplayPanel
