import { useEffect, useRef, useState } from 'react'
import { useSettingsItemLayout } from '../SettingsSurface'
import { SteamExplainerSliderField } from '../SteamExplainer'

type Props = { value: number; disabled: boolean; busy: boolean; onChange: (value: number) => Promise<void> }

export default function ManualFanSpeed({ value, disabled, busy, onChange }: Props) {
  const layout = useSettingsItemLayout()
  const [draft, setDraft] = useState<number | null>(null)
  const pending = useRef<number | null>(null)
  const writing = useRef(false)
  const mounted = useRef(false)
  const commit = useRef(onChange)
  commit.current = onChange
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const update = async (speed: number) => {
    if (disabled || (busy && !writing.current)) return
    setDraft(speed); pending.current = speed
    if (writing.current) return
    writing.current = true
    try {
      // Keep the final slider value when touch or D-pad input outpaces the RPC.
      while (pending.current !== null) {
        const next = pending.current
        pending.current = null
        await commit.current(next)
      }
    } catch {
      pending.current = null // The shared transaction restores authoritative state.
    } finally {
      writing.current = false
      if (mounted.current) setDraft(null)
    }
  }

  return <SteamExplainerSliderField label="Target speed" layout={layout}
    explainerTitle="Manual fan speed" explainer="Keeps the fan at your chosen speed. At 95°C, DeckyZone sets it to 100%."
    value={draft ?? value} min={10} max={100} step={1} showValue valueSuffix="%"
    disabled={disabled || (busy && !writing.current)} onChange={speed => { void update(speed) }} />
}
