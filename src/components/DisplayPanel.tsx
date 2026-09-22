import { callable } from '@decky/api'
import { PanelSection, PanelSectionRow, ToggleField, gamepadDialogClasses } from '@decky/ui'
import { useState } from 'react'
import type { PluginSettings } from '../types/plugin'
import { showRestartRequiredDialog } from '../utils/showRestartRequiredDialog'
import { useDeckyToastNotice } from '../utils/toasts'
import { SteamExplainerToggleField } from './SteamExplainer'

type Props = {
  settings: PluginSettings
  onSettingsChange: (nextSettings: PluginSettings) => void
}

const setGamescopeZotacProfileEnabled = callable<[boolean], PluginSettings>('set_gamescope_zotac_profile_enabled')
const setGamescopeGreenTintFixEnabled = callable<[boolean], PluginSettings>('set_gamescope_green_tint_fix_enabled')

const RESTART_NOTE = 'reboot after changing this'
const NATIVE_COLOR_TEMPERATURE_HINT = 'Tip: Settings -> Display -> Use Native Color Temperature'
const DISPLAY_UPDATE_FAILED_NOTICE = "Couldn't update display."
const DISPLAY_MISMATCH_NOTICE = 'Display change did not apply.'
const DISPLAY_VERIFICATION_NOTICE = 'Display profile needs attention.'
const DISPLAY_RESTART_REQUIRED_NOTICE = 'Restart to apply display change.'
const ZOTAC_PROFILE_DESCRIPTION = `Adds the Zotac OLED Gamescope profile if it's missing, ${RESTART_NOTE}`

function getGreenTintDescription(isBaseProfileAvailable: boolean) {
  if (!isBaseProfileAvailable) {
    return `Requires the Zotac OLED profile first, ${RESTART_NOTE}`
  }

  return undefined
}

function getGreenTintExplainer(settings: PluginSettings, isBaseProfileAvailable: boolean) {
  if (!isBaseProfileAvailable) {
    return 'The green tint fix requires the Zotac OLED profile. Enable the profile first, then restart SteamOS after changing this setting.'
  }

  const profile = settings.gamescopeZotacProfileBuiltIn
    ? 'built-in Zotac OLED profile'
    : 'Zotac OLED profile'
  return `Adjusts the ${profile}'s white point to reduce its green tint. Restart SteamOS after changing this setting.`
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
    <PanelSection title="Display">
      {!settings.gamescopeZotacProfileBuiltIn && (
        <PanelSectionRow>
          <ToggleField
            label="Enable Zotac OLED Profile"
            checked={settings.gamescopeZotacProfileInstalled}
            onChange={(value: boolean) => void handleZotacProfileChange(value)}
            disabled={savingZotacProfile}
            description={ZOTAC_PROFILE_DESCRIPTION}
          />
        </PanelSectionRow>
      )}
      <PanelSectionRow>
        <SteamExplainerToggleField
          label="Enable Green Tint Fix"
          explainerTitle="Green Tint Fix"
          explainer={getGreenTintExplainer(settings, isBaseProfileAvailable)}
          checked={settings.gamescopeGreenTintFixEnabled}
          onChange={(value: boolean) => void handleGreenTintFixChange(value)}
          disabled={savingGreenTintFix || !isBaseProfileAvailable}
          description={getGreenTintDescription(isBaseProfileAvailable)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div className={gamepadDialogClasses.FieldDescription}>{NATIVE_COLOR_TEMPERATURE_HINT}</div>
      </PanelSectionRow>
    </PanelSection>
  )
}

export default DisplayPanel
