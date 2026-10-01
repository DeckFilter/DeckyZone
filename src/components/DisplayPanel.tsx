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
const GREEN_TINT_EXPLAINER =
  "Adjusts the OLED profile's white point. It may not correct green tint at low brightness."

function getGreenTintDescription(isBaseProfileAvailable: boolean) {
  if (!isBaseProfileAvailable) {
    return `Requires the Zotac OLED profile first, ${RESTART_NOTE}`
  }

  return undefined
}

function getGreenTintExplainer(isBaseProfileAvailable: boolean) {
  if (!isBaseProfileAvailable) {
    return `Enable the Zotac OLED profile first. ${GREEN_TINT_EXPLAINER}`
  }

  return GREEN_TINT_EXPLAINER
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
        <SettingsDialogBodyText>{NATIVE_COLOR_TEMPERATURE_HINT}</SettingsDialogBodyText>
      )}
      <SettingsSection title="Display" settingsTitle={null}>
        {!settings.gamescopeZotacProfileBuiltIn && (
          <SettingsRow>
            <SteamExplainerToggleField
              label="Enable Zotac OLED Profile"
              explainerTitle="Zotac OLED Profile"
              explainer={ZOTAC_PROFILE_EXPLAINER}
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
            explainer={getGreenTintExplainer(isBaseProfileAvailable)}
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
