import { callable } from "@decky/api"
import { useRef, useState } from "react"
import { applyZotacGlyphsRuntimeEnabled } from "../glyphs/zotacGlyphRuntime"
import type { PluginSettingsUpdate } from "../state/DeckyZoneState"
import type { PluginSettings } from "../types/plugin"
import { useDeckyToastNotice } from "../utils/toasts"
import { SteamExplainerToggleField } from "./SteamExplainer"
import { SettingsRow, SettingsSection } from "./SettingsSurface"

type Props = {
  settings: PluginSettings
  onSettingsChange: (update: PluginSettingsUpdate) => void
}

const setZotacGlyphsEnabled = callable<[boolean], PluginSettings>("set_zotac_glyphs_enabled")
const setRemainingBatteryTimeFixEnabled = callable<[boolean], PluginSettings>(
  "set_remaining_battery_time_fix_enabled",
)

const ZOTAC_GLYPHS_EXPLAINER =
  "Shows Zotac controller button glyphs and controller images throughout the Steam interface."
const REMAINING_BATTERY_TIME_FIX_EXPLAINER =
  "Passes UPower's charging and discharging estimates to Steam through /run/vpower. The fix turns itself off when Valve's vpower service starts providing valid estimates."
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
    <SettingsSection title="Interface" settingsTitle={null}>
      <SettingsRow>
        <SteamExplainerToggleField
          label="Enable Zotac Glyphs"
          explainerTitle="Zotac Glyphs"
          explainer={ZOTAC_GLYPHS_EXPLAINER}
          settingsDescription="Uses Zotac controller icons"
          checked={settings.zotacGlyphsEnabled}
          onChange={(value: boolean) => void handleZotacGlyphsChange(value)}
          disabled={savingZotacGlyphs}
        />
      </SettingsRow>
      <SettingsRow>
        <SteamExplainerToggleField
          label="Enable Battery Time Fix"
          explainerTitle="Battery Time Fix"
          explainer={REMAINING_BATTERY_TIME_FIX_EXPLAINER}
          settingsDescription="Shows charging and remaining time"
          checked={settings.remainingBatteryTimeFixEnabled}
          onChange={(value: boolean) => void handleRemainingBatteryTimeFixChange(value)}
          disabled={savingRemainingBatteryTimeFix}
        />
      </SettingsRow>
    </SettingsSection>
  )
}

export default InterfacePanel
