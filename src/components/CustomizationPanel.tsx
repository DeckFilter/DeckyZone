import { callable } from "@decky/api"
import { useRef, useState } from "react"
import {
  applyHideUnsupportedButtonsRuntimeEnabled,
  applyZotacGlyphsRuntimeEnabled,
} from "../glyphs/zotacGlyphRuntime"
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
const setHideUnsupportedButtonsEnabled = callable<[boolean], PluginSettings>(
  "set_hide_unsupported_buttons_enabled",
)
const ZOTAC_CONTROLLER_ARTWORK_EXPLAINER =
  "Replaces supported Steam controller previews, the game launch animation, calibration images, and button glyphs with Zotac versions."
const HIDE_UNSUPPORTED_BUTTONS_EXPLAINER =
  "Hides the L5 and R5 controls and Steam Input trackpad settings that do not work on the Zotac Zone. The Zone's trackpads remain available through DeckyZone's Trackpad Mode setting."
const CUSTOMIZATION_UPDATE_FAILED_NOTICE = "Couldn't update setting."
const CONTROLLER_ARTWORK_APPLY_FAILED_NOTICE = "Couldn't apply controller artwork live."
const BUTTON_HIDING_APPLY_FAILED_NOTICE = "Couldn't update hidden buttons live."

const CustomizationPanel = ({ settings, onSettingsChange }: Props) => {
  const [savingZotacGlyphs, setSavingZotacGlyphs] = useState(false)
  const savingZotacGlyphsRef = useRef(false)
  const [savingHideUnsupportedButtons, setSavingHideUnsupportedButtons] = useState(false)
  const savingHideUnsupportedButtonsRef = useRef(false)
  const [customizationNotice, setCustomizationNotice] = useState<string | null>(null)

  useDeckyToastNotice(
    customizationNotice
      ? {
          activeKey: `customization:${customizationNotice}`,
          title: "Customization",
          body: customizationNotice,
          severity: "error",
        }
      : null,
  )

  const handleZotacGlyphsChange = async (enabled: boolean) => {
    if (savingZotacGlyphsRef.current) {
      return
    }

    const previousEnabled = settings.zotacGlyphsEnabled
    savingZotacGlyphsRef.current = true
    setSavingZotacGlyphs(true)
    setCustomizationNotice(null)
    onSettingsChange((currentSettings) => ({
      ...currentSettings,
      zotacGlyphsEnabled: enabled,
    }))

    try {
      const nextSettings = await setZotacGlyphsEnabled(enabled)
      onSettingsChange(nextSettings)
    } catch {
      setCustomizationNotice(CUSTOMIZATION_UPDATE_FAILED_NOTICE)
      onSettingsChange((currentSettings) => ({
        ...currentSettings,
        zotacGlyphsEnabled: previousEnabled,
      }))
      savingZotacGlyphsRef.current = false
      setSavingZotacGlyphs(false)
      return
    }

    try {
      await applyZotacGlyphsRuntimeEnabled(enabled)
      setCustomizationNotice(null)
    } catch {
      setCustomizationNotice(CONTROLLER_ARTWORK_APPLY_FAILED_NOTICE)
    } finally {
      savingZotacGlyphsRef.current = false
      setSavingZotacGlyphs(false)
    }
  }

  const handleHideUnsupportedButtonsChange = async (enabled: boolean) => {
    if (savingHideUnsupportedButtonsRef.current) {
      return
    }

    const previousEnabled = settings.hideUnsupportedButtonsEnabled
    savingHideUnsupportedButtonsRef.current = true
    setSavingHideUnsupportedButtons(true)
    setCustomizationNotice(null)
    onSettingsChange((currentSettings) => ({
      ...currentSettings,
      hideUnsupportedButtonsEnabled: enabled,
    }))

    try {
      const nextSettings = await setHideUnsupportedButtonsEnabled(enabled)
      onSettingsChange(nextSettings)
    } catch {
      setCustomizationNotice(CUSTOMIZATION_UPDATE_FAILED_NOTICE)
      onSettingsChange((currentSettings) => ({
        ...currentSettings,
        hideUnsupportedButtonsEnabled: previousEnabled,
      }))
      savingHideUnsupportedButtonsRef.current = false
      setSavingHideUnsupportedButtons(false)
      return
    }

    try {
      await applyHideUnsupportedButtonsRuntimeEnabled(enabled)
      setCustomizationNotice(null)
    } catch {
      setCustomizationNotice(BUTTON_HIDING_APPLY_FAILED_NOTICE)
    } finally {
      savingHideUnsupportedButtonsRef.current = false
      setSavingHideUnsupportedButtons(false)
    }
  }

  return (
    <SettingsSection title="Customization" settingsTitle={null}>
      <SettingsRow>
        <SteamExplainerToggleField
          label="Zotac Controller Artwork"
          explainerTitle="Zotac Controller Artwork"
          explainer={ZOTAC_CONTROLLER_ARTWORK_EXPLAINER}
          settingsDescription="Uses Zotac images and button glyphs"
          checked={settings.zotacGlyphsEnabled}
          onChange={(value: boolean) => void handleZotacGlyphsChange(value)}
          disabled={savingZotacGlyphs}
        />
      </SettingsRow>
      <SettingsRow>
        <SteamExplainerToggleField
          label="Hide Unsupported Controls"
          explainerTitle="Unsupported Controls"
          explainer={HIDE_UNSUPPORTED_BUTTONS_EXPLAINER}
          settingsDescription="Hides unused buttons and trackpad settings"
          checked={settings.hideUnsupportedButtonsEnabled}
          onChange={(value: boolean) => void handleHideUnsupportedButtonsChange(value)}
          disabled={savingHideUnsupportedButtons}
        />
      </SettingsRow>
    </SettingsSection>
  )
}

export default CustomizationPanel
