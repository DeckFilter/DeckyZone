import { callable } from "@decky/api"
import { ToggleField } from "@decky/ui"
import { useRef, useState, type ComponentProps, type ComponentType } from "react"
import {
  applyHideUnsupportedButtonsRuntimeEnabled,
  applyZotacDeviceArtworkRuntimeEnabled,
  applyZotacGlyphsRuntimeEnabled,
  applyZotacLaunchAnimationsRuntimeEnabled,
} from "../glyphs/zotacGlyphRuntime"
import type { PluginSettingsUpdate } from "../state/DeckyZoneState"
import type { PluginSettings } from "../types/plugin"
import { useDeckyToastNotice } from "../utils/toasts"
import { SettingsRow, SettingsSection } from "./SettingsSurface"

type Props = {
  settings: PluginSettings
  onSettingsChange: (update: PluginSettingsUpdate) => void
}

const setZotacGlyphsEnabled = callable<[boolean], PluginSettings>("set_zotac_glyphs_enabled")
const setZotacLaunchAnimationsEnabled = callable<[boolean], PluginSettings>("set_zotac_launch_animations_enabled")
const setZotacDeviceArtworkEnabled = callable<[boolean], PluginSettings>("set_zotac_device_artwork_enabled")
const setHideUnsupportedButtonsEnabled = callable<[boolean], PluginSettings>(
  "set_hide_unsupported_buttons_enabled",
)
const CUSTOMIZATION_UPDATE_FAILED_NOTICE = "Couldn't update setting."
const ControlledToggleField = ToggleField as ComponentType<ComponentProps<typeof ToggleField> & { controlled: boolean }>

type CustomizationSetting = 'zotacGlyphsEnabled' | 'zotacLaunchAnimationsEnabled'
  | 'zotacDeviceArtworkEnabled' | 'hideUnsupportedButtonsEnabled'
type CustomizationOption = {
  key: CustomizationSetting
  label: string
  explainer: string
  save: (enabled: boolean) => Promise<PluginSettings>
  apply: (enabled: boolean) => Promise<void>
  applyFailedNotice: string
}

const customizationOptions: CustomizationOption[] = [
  {
    key: 'zotacGlyphsEnabled',
    label: 'Zotac Button Glyphs',
    explainer: 'Replaces supported Steam button icons with Zotac versions.',
    save: setZotacGlyphsEnabled,
    apply: applyZotacGlyphsRuntimeEnabled,
    applyFailedNotice: "Couldn't apply button glyphs live.",
  },
  {
    key: 'zotacLaunchAnimationsEnabled',
    label: 'Game Launch Animations',
    explainer: "Uses Zotac animations when starting a game. Animations follow the selected layout's controller, mouse, or touchscreen controls.",
    save: setZotacLaunchAnimationsEnabled,
    apply: applyZotacLaunchAnimationsRuntimeEnabled,
    applyFailedNotice: "Couldn't apply launch animations live.",
  },
  {
    key: 'zotacDeviceArtworkEnabled',
    label: 'Zotac Device Artwork',
    explainer: 'Replaces supported Steam controller previews and calibration images with Zotac artwork.',
    save: setZotacDeviceArtworkEnabled,
    apply: applyZotacDeviceArtworkRuntimeEnabled,
    applyFailedNotice: "Couldn't apply device artwork live.",
  },
  {
    key: 'hideUnsupportedButtonsEnabled',
    label: 'Hide Unsupported Controls',
    explainer: 'Hides the L5 and R5 controls and Steam Input trackpad settings that do not work on the ZONE. Configure the trackpads in Controller settings > Trackpads.',
    save: setHideUnsupportedButtonsEnabled,
    apply: applyHideUnsupportedButtonsRuntimeEnabled,
    applyFailedNotice: "Couldn't update hidden buttons live.",
  },
]

const CustomizationPanel = ({ settings, onSettingsChange }: Props) => {
  const [saving, setSaving] = useState<Partial<Record<CustomizationSetting, boolean>>>({})
  const savingRef = useRef(new Set<CustomizationSetting>())
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

  const handleCustomizationChange = async (option: CustomizationOption, enabled: boolean) => {
    const key = option.key
    if (savingRef.current.has(key)) {
      return
    }

    let previousEnabled = settings[key]
    savingRef.current.add(key)
    setSaving((current) => ({ ...current, [key]: true }))
    setCustomizationNotice(null)
    onSettingsChange((currentSettings) => {
      previousEnabled = currentSettings[key]
      return { ...currentSettings, [key]: enabled }
    })

    let savedEnabled: boolean
    try {
      const nextSettings = await option.save(enabled)
      savedEnabled = nextSettings[key]
      onSettingsChange((currentSettings) => ({ ...currentSettings, [key]: savedEnabled }))
    } catch {
      setCustomizationNotice(CUSTOMIZATION_UPDATE_FAILED_NOTICE)
      onSettingsChange((currentSettings) => ({
        ...currentSettings,
        [key]: previousEnabled,
      }))
      savingRef.current.delete(key)
      setSaving((current) => ({ ...current, [key]: false }))
      return
    }

    try {
      await option.apply(savedEnabled)
      setCustomizationNotice(null)
    } catch {
      setCustomizationNotice(option.applyFailedNotice)
    } finally {
      savingRef.current.delete(key)
      setSaving((current) => ({ ...current, [key]: false }))
    }
  }

  return (
    <SettingsSection title="Customization" settingsTitle={null}>
      {customizationOptions.map((option) => (
        <SettingsRow key={option.key}>
          <ControlledToggleField
            controlled
            label={option.label}
            explainerTitle={option.label}
            explainer={option.explainer}
            checked={settings[option.key]}
            onChange={(value: boolean) => void handleCustomizationChange(option, value)}
            disabled={saving[option.key] ?? false}
          />
        </SettingsRow>
      ))}
    </SettingsSection>
  )
}

export default CustomizationPanel
