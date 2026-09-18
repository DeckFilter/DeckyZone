import { callable } from '@decky/api'
import { PanelSection, PanelSectionRow, ToggleField } from '@decky/ui'
import { useRef, useState } from 'react'
import type { PluginSettings } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'

type Props = {
  settings: PluginSettings
  onSettingsChange: (nextSettings: PluginSettings) => void
}

const setLegacyLayoutEnabled = callable<[boolean], PluginSettings>('set_legacy_layout_enabled')
const LAYOUT_UPDATE_FAILED_NOTICE = "Couldn't update layout."

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
    <PanelSection title="Layout">
      <PanelSectionRow>
        <ToggleField
          label="Legacy Layout"
          description="Show all sections in one scrolling list"
          checked={settings.legacyLayoutEnabled}
          disabled={saving}
          onChange={(enabled: boolean) => void handleLegacyLayoutChange(enabled)}
        />
      </PanelSectionRow>
    </PanelSection>
  )
}

export default LayoutPanel
