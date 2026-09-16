import { callable } from "@decky/api"
import { PanelSection, PanelSectionRow, ToggleField } from "@decky/ui"
import { useRef, useState } from "react"
import { applyZotacGlyphsRuntimeEnabled } from "../glyphs/zotacGlyphRuntime"
import type { PluginSettings } from "../types/plugin"
import { useDeckyToastNotice } from "../utils/toasts"

type Props = {
  settings: PluginSettings
  onSettingsChange: (
    update: PluginSettings | ((currentSettings: PluginSettings) => PluginSettings)
  ) => void
}

const setZotacGlyphsEnabled = callable<[boolean], PluginSettings>("set_zotac_glyphs_enabled")
const setRemainingBatteryTimeFixEnabled = callable<[boolean], PluginSettings>(
  "set_remaining_battery_time_fix_enabled",
)

const ZOTAC_GLYPHS_DESCRIPTION = "Applies Zotac controller glyphs and images"
const REMAINING_BATTERY_TIME_FIX_DESCRIPTION =
  "Shows UPower's remaining-time estimate in Steam"
const INTERFACE_UPDATE_FAILED_NOTICE = "Couldn't update setting."
const GLYPH_APPLY_FAILED_NOTICE = "Couldn't apply glyphs live."

const InterfacePanel = ({ settings, onSettingsChange }: Props) => {
  const [savingZotacGlyphs, setSavingZotacGlyphs] = useState(false)
  const [savingRemainingBatteryTimeFix, setSavingRemainingBatteryTimeFix] =
    useState(false)
  const savingRemainingBatteryTimeFixRef = useRef(false)
  const [interfaceNotice, setInterfaceNotice] = useState<string | null>(null)

  useDeckyToastNotice(
    interfaceNotice
      ? {
          activeKey: `interface:${interfaceNotice}`,
          title: "Interface",
          body: interfaceNotice,
          severity: "error",
        }
      : null,
  )

  const handleZotacGlyphsChange = async (enabled: boolean) => {
    setSavingZotacGlyphs(true)
    setInterfaceNotice(null)

    try {
      const nextSettings = await setZotacGlyphsEnabled(enabled)
      onSettingsChange(nextSettings)
    } catch {
      setInterfaceNotice(INTERFACE_UPDATE_FAILED_NOTICE)
      setSavingZotacGlyphs(false)
      return
    }

    setSavingZotacGlyphs(false)

    try {
      await applyZotacGlyphsRuntimeEnabled(enabled)
      setInterfaceNotice(null)
    } catch {
      setInterfaceNotice(GLYPH_APPLY_FAILED_NOTICE)
    }
  }

  const handleRemainingBatteryTimeFixChange = async (enabled: boolean) => {
    if (savingRemainingBatteryTimeFixRef.current) {
      return
    }

    const previousEnabled = settings.remainingBatteryTimeFixEnabled
    savingRemainingBatteryTimeFixRef.current = true
    setSavingRemainingBatteryTimeFix(true)
    setInterfaceNotice(null)
    onSettingsChange((currentSettings) => ({
      ...currentSettings,
      remainingBatteryTimeFixEnabled: enabled,
    }))

    try {
      const nextSettings = await setRemainingBatteryTimeFixEnabled(enabled)
      onSettingsChange(nextSettings)
    } catch {
      setInterfaceNotice(INTERFACE_UPDATE_FAILED_NOTICE)
      onSettingsChange((currentSettings) => ({
        ...currentSettings,
        remainingBatteryTimeFixEnabled: previousEnabled,
      }))
    } finally {
      savingRemainingBatteryTimeFixRef.current = false
      setSavingRemainingBatteryTimeFix(false)
    }
  }

  return (
    <PanelSection title="Interface">
      <PanelSectionRow>
        <ToggleField
          label="Enable Zotac Glyphs"
          checked={settings.zotacGlyphsEnabled}
          onChange={(value: boolean) => void handleZotacGlyphsChange(value)}
          disabled={savingZotacGlyphs}
          description={ZOTAC_GLYPHS_DESCRIPTION}
        />
      </PanelSectionRow>
      <PanelSectionRow>
        <ToggleField
          label="Enable Battery Time Fix"
          checked={settings.remainingBatteryTimeFixEnabled}
          onChange={(value: boolean) => void handleRemainingBatteryTimeFixChange(value)}
          disabled={savingRemainingBatteryTimeFix}
          description={REMAINING_BATTERY_TIME_FIX_DESCRIPTION}
        />
      </PanelSectionRow>
    </PanelSection>
  )
}

export default InterfacePanel
