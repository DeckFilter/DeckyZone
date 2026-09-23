import { callable } from '@decky/api'
import { useRef, useState } from 'react'
import type { PluginSettings } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'
import { SteamExplainerToggleField } from './SteamExplainer'
import { SettingsRow, SettingsSection } from './SettingsSurface'

type Props = {
  settings: PluginSettings
  onSettingsChange: (nextSettings: PluginSettings) => void
}

const setLegacyLayoutEnabled = callable<[boolean], PluginSettings>('set_legacy_layout_enabled')
const LAYOUT_UPDATE_FAILED_NOTICE = "Couldn't update layout."
const LEGACY_LAYOUT_EXPLAINER =
  'Shows every DeckyZone Quick Access Menu section in one scrolling list instead of icon tabs. This affects only the Quick Access Menu.'

const LayoutPanel = ({ settings, onSettingsChange }: Props) => {
  const [saving, setSaving] = useState(false)
  const [layoutNotice, setLayoutNotice] = useState<string | null>(null)
  const savingRef = useRef(false)

  useDeckyToastNotice(
    layoutNotice
      ? {
          activeKey: `layout:${layoutNotice}`,
          title: 'Layout',
          body: layoutNotice,
          severity: 'error',
        }
      : null,
  )

  const handleLegacyLayoutChange = async (enabled: boolean) => {
    if (savingRef.current) {
      return
    }

    savingRef.current = true
    setSaving(true)
    setLayoutNotice(null)

    try {
      const nextSettings = await setLegacyLayoutEnabled(enabled)
      savingRef.current = false
      setSaving(false)
      onSettingsChange(nextSettings)
    } catch {
      savingRef.current = false
      setSaving(false)
      setLayoutNotice(LAYOUT_UPDATE_FAILED_NOTICE)
      return
    }

  }

  return (
    <SettingsSection title="Layout">
      <SettingsRow>
        <SteamExplainerToggleField
          label="Legacy Layout"
          explainerTitle="Legacy Layout"
          explainer={LEGACY_LAYOUT_EXPLAINER}
          settingsDescription="Changes the Quick Access Menu layout"
          checked={settings.legacyLayoutEnabled}
          disabled={saving}
          onChange={(enabled: boolean) => void handleLegacyLayoutChange(enabled)}
        />
      </SettingsRow>
    </SettingsSection>
  )
}

export default LayoutPanel
