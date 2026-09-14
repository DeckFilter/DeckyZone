import { callable } from '@decky/api'
import { DropdownItem, PanelSection, PanelSectionRow, gamepadDialogClasses } from '@decky/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PluginSettings } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'

type Props = {
  settings: PluginSettings
  onSettingsChange: (nextSettings: PluginSettings) => void
}

type VramOption = { data: number; label: string }

const setVramSizeGb = callable<[number], PluginSettings>('set_vram_size_gb')

const VRAM_DEFAULT_GB = 4
const VRAM_DESCRIPTION = 'Memory reserved for the GPU (UMA framebuffer), reboot after changing this'
const VRAM_UNAVAILABLE_DESCRIPTION = 'VRAM control is not available on this device'
const VRAM_UPDATE_FAILED_NOTICE = "Couldn't update VRAM size."
const VRAM_REBOOT_REQUIRED_NOTICE = 'Reboot to apply VRAM change.'

function clampVramGb(value: number, minVramGb: number, maxVramGb: number) {
  return Math.min(maxVramGb, Math.max(minVramGb, Math.round(value)))
}

function getVramValue(settings: PluginSettings) {
  const { pendingVramGb, activeVramGb, minVramGb, maxVramGb } = settings.vram
  return clampVramGb(pendingVramGb ?? activeVramGb ?? VRAM_DEFAULT_GB, minVramGb, maxVramGb)
}

function getVramDescription(settings: PluginSettings) {
  if (!settings.vram.available) {
    return VRAM_UNAVAILABLE_DESCRIPTION
  }

  return VRAM_DESCRIPTION
}

function getVramRebootHint(settings: PluginSettings) {
  const { available, rebootRequired, pendingVramGb, activeVramGb } = settings.vram
  if (!available || !rebootRequired || pendingVramGb === null || activeVramGb === null) {
    return null
  }

  return `Reboot required: ${activeVramGb} GB active, ${pendingVramGb} GB after reboot`
}

const PerformancePanel = ({ settings, onSettingsChange }: Props) => {
  const [savingVram, setSavingVram] = useState(false)
  const savingVramRef = useRef(false)
  const [vramDraftGb, setVramDraftGb] = useState(() => getVramValue(settings))
  const [vramNotice, setVramNotice] = useState<string | null>(null)
  const vramOptions = useMemo<VramOption[]>(
    () =>
      Array.from({ length: settings.vram.maxVramGb - settings.vram.minVramGb + 1 }, (_, index) => {
        const value = settings.vram.minVramGb + index
        return { data: value, label: `${value} GB` }
      }),
    [settings.vram.minVramGb, settings.vram.maxVramGb],
  )
  const selectedVramOption = vramOptions.find((option) => option.data === vramDraftGb)
  const vramRebootHint = getVramRebootHint(settings)

  useEffect(() => {
    setVramDraftGb(getVramValue(settings))
  }, [
    settings.vram.pendingVramGb,
    settings.vram.activeVramGb,
    settings.vram.minVramGb,
    settings.vram.maxVramGb,
  ])

  useDeckyToastNotice(
    vramNotice
      ? {
          activeKey: `vram-action:${vramNotice}:${vramDraftGb}`,
          title: 'Performance',
          body: vramNotice,
          severity: vramNotice === VRAM_UPDATE_FAILED_NOTICE ? 'error' : 'warning',
        }
      : null,
  )

  const handleVramChange = async (nextVramGb: number) => {
    if (savingVramRef.current) {
      return
    }

    const clampedVramGb = clampVramGb(nextVramGb, settings.vram.minVramGb, settings.vram.maxVramGb)
    const currentVramGb = settings.vram.pendingVramGb ?? settings.vram.activeVramGb
    if (clampedVramGb === currentVramGb) {
      setVramDraftGb(clampedVramGb)
      return
    }

    savingVramRef.current = true
    setVramNotice(null)
    setSavingVram(true)
    setVramDraftGb(clampedVramGb)
    try {
      const nextSettings = await setVramSizeGb(clampedVramGb)
      onSettingsChange(nextSettings)
      setVramNotice(
        nextSettings.vram.pendingVramGb !== clampedVramGb ? VRAM_UPDATE_FAILED_NOTICE : VRAM_REBOOT_REQUIRED_NOTICE,
      )
    } catch {
      setVramNotice(VRAM_UPDATE_FAILED_NOTICE)
      setVramDraftGb(getVramValue(settings))
    } finally {
      savingVramRef.current = false
      setSavingVram(false)
    }
  }

  return (
    <PanelSection title="Performance">
      <PanelSectionRow>
        <DropdownItem
          key={`vram-size:${vramDraftGb}`}
          label="VRAM Size"
          menuLabel="VRAM Size"
          description={getVramDescription(settings)}
          rgOptions={vramOptions}
          strDefaultLabel={selectedVramOption?.label ?? `${vramDraftGb} GB`}
          selectedOption={selectedVramOption?.data ?? vramDraftGb}
          onChange={(option: { data: number }) => void handleVramChange(option.data)}
          disabled={savingVram || !settings.vram.available}
        />
      </PanelSectionRow>
      {vramRebootHint && (
        <PanelSectionRow>
          <div className={gamepadDialogClasses.FieldDescription}>{vramRebootHint}</div>
        </PanelSectionRow>
      )}
    </PanelSection>
  )
}

export default PerformancePanel
