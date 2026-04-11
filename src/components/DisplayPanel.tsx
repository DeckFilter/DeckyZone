import { callable } from '@decky/api'
import { PanelSection, PanelSectionRow, ToggleField, gamepadDialogClasses } from '@decky/ui'
import { useState } from 'react'
import type { PluginSettings } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'

type Props = {
  settings: PluginSettings
  onSettingsChange: (nextSettings: PluginSettings) => void
}

const setGamescopeZotacProfileEnabled = callable<[boolean], PluginSettings>('set_gamescope_zotac_profile_enabled')
const setGamescopeGreenTintFixEnabled = callable<[boolean], PluginSettings>('set_gamescope_green_tint_fix_enabled')

const RESTART_NOTE = 'reboot after changing this'
const NATIVE_COLOR_TEMPERATURE_HINT = 'Tip: Settings -> Display -> Use Native Color Temperature'
const SUPPORT_POPUP_HINT = 'Open the header info popup for details.'
const DISPLAY_UPDATE_FAILED_NOTICE = `Couldn't update the display setting. ${SUPPORT_POPUP_HINT}`
const DISPLAY_MISMATCH_NOTICE = `Display profile did not match the requested state. ${SUPPORT_POPUP_HINT}`
const DISPLAY_VERIFICATION_NOTICE = `Display profile needs attention. ${SUPPORT_POPUP_HINT}`
const DISPLAY_RESTART_REQUIRED_NOTICE = 'Restart the device for the display profile change to take effect.'
const ZOTAC_PROFILE_DESCRIPTION = `Adds the Zotac OLED Gamescope profile if it's missing, ${RESTART_NOTE}`

function getGreenTintDescription(settings: PluginSettings, isBaseProfileAvailable: boolean) {
  if (!isBaseProfileAvailable) {
    return `Requires the Zotac OLED profile first, ${RESTART_NOTE}`
  }

  if (settings.gamescopeZotacProfileBuiltIn) {
    return `Applies a white point correction to the built-in Zotac OLED profile, ${RESTART_NOTE}`
  }

  return `Applies a white point correction to reduce green tint, ${RESTART_NOTE}`
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
    setDisplayNotice(null)
    setSavingZotacProfile(true)
    try {
      const nextSettings = await setGamescopeZotacProfileEnabled(enabled)
      onSettingsChange(nextSettings)
      setDisplayNotice(
        nextSettings.gamescopeZotacProfileInstalled !== enabled ? DISPLAY_MISMATCH_NOTICE : DISPLAY_RESTART_REQUIRED_NOTICE,
      )
    } catch {
      setDisplayNotice(DISPLAY_UPDATE_FAILED_NOTICE)
    } finally {
      setSavingZotacProfile(false)
    }
  }

  const handleGreenTintFixChange = async (enabled: boolean) => {
    setDisplayNotice(null)
    setSavingGreenTintFix(true)
    try {
      const nextSettings = await setGamescopeGreenTintFixEnabled(enabled)
      onSettingsChange(nextSettings)
      setDisplayNotice(
        nextSettings.gamescopeGreenTintFixEnabled !== enabled ? DISPLAY_MISMATCH_NOTICE : DISPLAY_RESTART_REQUIRED_NOTICE,
      )
    } catch {
      setDisplayNotice(DISPLAY_UPDATE_FAILED_NOTICE)
    } finally {
      setSavingGreenTintFix(false)
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
        <ToggleField
          label="Enable Green Tint Fix"
          checked={settings.gamescopeGreenTintFixEnabled}
          onChange={(value: boolean) => void handleGreenTintFixChange(value)}
          disabled={savingGreenTintFix || !isBaseProfileAvailable}
          description={getGreenTintDescription(settings, isBaseProfileAvailable)}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <div className={gamepadDialogClasses.FieldDescription}>{NATIVE_COLOR_TEMPERATURE_HINT}</div>
      </PanelSectionRow>
    </PanelSection>
  )
}

export default DisplayPanel
