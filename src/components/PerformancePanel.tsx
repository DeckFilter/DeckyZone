import { callable } from '@decky/api'
import { DropdownItem, PanelSection, PanelSectionRow, gamepadDialogClasses } from '@decky/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ComponentProps, ComponentType } from 'react'
import type { PluginSettings } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'

type Props = {
  settings: PluginSettings
  onSettingsChange: (
    update: PluginSettings | ((currentSettings: PluginSettings) => PluginSettings)
  ) => void
}

type VramOption = { data: number; label: string }

const setVramSizeGb = callable<[number], PluginSettings>('set_vram_size_gb')
const ControlledDropdownItem = DropdownItem as ComponentType<
  ComponentProps<typeof DropdownItem> & { controlled: boolean }
>

const VRAM_DEFAULT_GB = 4
const VRAM_DESCRIPTION = 'Memory reserved for the GPU (UMA framebuffer), reboot after changing this'
const VRAM_UNAVAILABLE_DESCRIPTION = 'Current VRAM setting is unavailable'
const VRAM_UNKNOWN_LABEL = 'Unknown'
const VRAM_UPDATE_FAILED_NOTICE = "Couldn't update VRAM size."
const VRAM_REBOOT_REQUIRED_NOTICE = 'Reboot to apply VRAM change.'

function getVramOptionLabel(vramGb: number) {
  return `${vramGb} GB${vramGb === VRAM_DEFAULT_GB ? ' (Default)' : ''}`
}

function isValidVramGb(value: number | null, minVramGb: number, maxVramGb: number): value is number {
  return value !== null && Number.isInteger(value) && value >= minVramGb && value <= maxVramGb
}

function getVramValue(settings: PluginSettings) {
  const { available, pendingVramGb, minVramGb, maxVramGb } = settings.vram
  return available && isValidVramGb(pendingVramGb, minVramGb, maxVramGb) ? pendingVramGb : null
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

function getOptimisticVramSettings(settings: PluginSettings, pendingVramGb: number): PluginSettings {
  const activeVramGb = settings.vram.activeVramGb

  return {
    ...settings,
    vram: {
      ...settings.vram,
      pendingVramGb,
      rebootRequired: activeVramGb !== null && Math.abs(pendingVramGb - activeVramGb) >= 0.5,
    },
  }
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
        return { data: value, label: getVramOptionLabel(value) }
      }),
    [settings.vram.minVramGb, settings.vram.maxVramGb],
  )
  const vramRebootHint = getVramRebootHint(settings)

  useEffect(() => {
    setVramDraftGb(getVramValue(settings))
  }, [
    settings.vram.pendingVramGb,
    settings.vram.available,
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

    if (!isValidVramGb(nextVramGb, settings.vram.minVramGb, settings.vram.maxVramGb)) {
      setVramNotice(VRAM_UPDATE_FAILED_NOTICE)
      return
    }

    const currentVramGb = settings.vram.pendingVramGb ?? settings.vram.activeVramGb
    if (nextVramGb === currentVramGb) {
      setVramDraftGb(nextVramGb)
      return
    }

    const previousVram = { ...settings.vram }
    const previousVramGb = getVramValue(settings)
    savingVramRef.current = true
    setVramNotice(null)
    setSavingVram(true)
    setVramDraftGb(nextVramGb)
    onSettingsChange(getOptimisticVramSettings(settings, nextVramGb))
    try {
      const nextSettings = await setVramSizeGb(nextVramGb)
      const confirmedVramGb = getVramValue(nextSettings)
      onSettingsChange(nextSettings)
      setVramDraftGb(confirmedVramGb)
      setVramNotice(
        nextSettings.vram.pendingVramGb !== nextVramGb
          ? VRAM_UPDATE_FAILED_NOTICE
          : nextSettings.vram.rebootRequired
            ? VRAM_REBOOT_REQUIRED_NOTICE
            : null,
      )
    } catch {
      setVramNotice(VRAM_UPDATE_FAILED_NOTICE)
      onSettingsChange((currentSettings) => ({
        ...currentSettings,
        vram: previousVram,
      }))
      setVramDraftGb(previousVramGb)
    } finally {
      savingVramRef.current = false
      setSavingVram(false)
    }
  }

  return (
    <PanelSection title="Performance">
      <PanelSectionRow>
        <ControlledDropdownItem
          controlled
          label="VRAM Size"
          menuLabel="VRAM Size"
          description={getVramDescription(settings)}
          rgOptions={vramOptions}
          strDefaultLabel={vramDraftGb === null ? VRAM_UNKNOWN_LABEL : getVramOptionLabel(vramDraftGb)}
          selectedOption={vramDraftGb}
          onChange={(option: VramOption) => void handleVramChange(option.data)}
          disabled={savingVram || !settings.vram.available || vramDraftGb === null}
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
