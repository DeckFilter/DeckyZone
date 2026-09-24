import { callable } from '@decky/api'
import { gamepadDialogClasses } from '@decky/ui'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import type { PluginSettingsUpdate } from '../state/DeckyZoneState'
import type { PluginSettings } from '../types/plugin'
import { showRestartRequiredDialog } from '../utils/showRestartRequiredDialog'
import { useDeckyToastNotice } from '../utils/toasts'
import { SteamExplainerDropdownItem } from './SteamExplainer'
import { SettingsRow, SettingsSection, useSettingsSurface } from './SettingsSurface'

type Props = {
  settings: PluginSettings
  settingsLeadingRows?: ReactNode
  onSettingsChange: (update: PluginSettingsUpdate) => void
}

type VramOption = { data: number; label: string }

const setVramSizeGb = callable<[number], PluginSettings>('set_vram_size_gb')

const VRAM_DEFAULT_GB = 4
const VRAM_EXPLAINER =
  'Reserves system memory for the integrated GPU as a UMA framebuffer. Higher values leave less memory for games and SteamOS.'
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
  return settings.vram.available ? undefined : VRAM_UNAVAILABLE_DESCRIPTION
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

const PerformancePanel = ({ settings, settingsLeadingRows, onSettingsChange }: Props) => {
  const surface = useSettingsSurface()
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
  const vramDescription = getVramDescription(settings)
    ?? (surface === 'settings' ? vramRebootHint ?? undefined : undefined)

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
    let restartRequired = false
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
      if (nextSettings.vram.pendingVramGb !== nextVramGb) {
        setVramNotice(VRAM_UPDATE_FAILED_NOTICE)
      } else if (nextSettings.vram.rebootRequired) {
        restartRequired = true
      }
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

    if (restartRequired) {
      try {
        showRestartRequiredDialog()
      } catch {
        setVramNotice(VRAM_REBOOT_REQUIRED_NOTICE)
      }
    }
  }

  return (
    <SettingsSection title="Performance" settingsTitle={null}>
      {surface === 'settings' && settingsLeadingRows}
      <SettingsRow>
        <SteamExplainerDropdownItem
          controlled
          layout="below"
          label="VRAM Size"
          menuLabel="VRAM Size"
          explainerTitle="VRAM Size"
          explainer={VRAM_EXPLAINER}
          settingsDescription="Reserves memory for the integrated GPU"
          description={vramDescription}
          rgOptions={vramOptions}
          strDefaultLabel={vramDraftGb === null ? VRAM_UNKNOWN_LABEL : getVramOptionLabel(vramDraftGb)}
          selectedOption={vramDraftGb}
          onChange={(option: VramOption) => void handleVramChange(option.data)}
          disabled={savingVram || !settings.vram.available || vramDraftGb === null}
        />
      </SettingsRow>
      {surface === 'quick-access' && vramRebootHint && (
        <SettingsRow>
          <div className={gamepadDialogClasses.FieldDescription}>{vramRebootHint}</div>
        </SettingsRow>
      )}
    </SettingsSection>
  )
}

export default PerformancePanel
