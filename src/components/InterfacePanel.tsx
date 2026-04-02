import { callable } from "@decky/api"
import { PanelSection, PanelSectionRow, ToggleField, gamepadDialogClasses } from "@decky/ui"
import { useState } from "react"
import { applyZotacGlyphsRuntimeEnabled } from "../glyphs/zotacGlyphRuntime"
import type { PluginSettings } from "../types/plugin"

type Props = {
  settings: PluginSettings
  onSettingsChange: (nextSettings: PluginSettings) => void
}

const setZotacGlyphsEnabled = callable<[boolean], PluginSettings>("set_zotac_glyphs_enabled")

const ZOTAC_GLYPHS_DESCRIPTION = "Applies Zotac controller glyphs and images"
const SUPPORT_POPUP_HINT = "Open the header info popup for details."
const INTERFACE_UPDATE_FAILED_NOTICE = `Couldn't update the interface setting. ${SUPPORT_POPUP_HINT}`
const GLYPH_APPLY_FAILED_NOTICE = `Couldn't apply Zotac glyphs live. ${SUPPORT_POPUP_HINT}`

const InterfacePanel = ({ settings, onSettingsChange }: Props) => {
  const [savingZotacGlyphs, setSavingZotacGlyphs] = useState(false)
  const [interfaceNotice, setInterfaceNotice] = useState<string | null>(null)

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
      {interfaceNotice && (
        <PanelSectionRow>
          <div className={gamepadDialogClasses.FieldDescription}>{interfaceNotice}</div>
        </PanelSectionRow>
      )}
    </PanelSection>
  )
}

export default InterfacePanel
