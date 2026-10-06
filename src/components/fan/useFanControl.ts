import { callable } from '@decky/api'
import { useEffect, useRef, useState } from 'react'
import type { FanControlResult, FanControlState, FanMode, FanPoint, PowerControlFanProfile } from '../../types/plugin'
import { useDeckyToastNotice } from '../../utils/toasts'

export const fanApi = {
  status: callable<[], FanControlState>('get_fan_control_status'),
  mode: callable<[FanMode, number], FanControlResult>('set_fan_control_mode'),
  manualSpeed: callable<[number, number], FanControlResult>('set_manual_fan_speed'),
  save: callable<[FanPoint[], number], FanControlResult>('save_fan_curve'),
  imports: callable<[], PowerControlFanProfile[]>('get_powercontrol_fan_profiles'),
}

// Polls must never overwrite an optimistic selection or reconcile an older
// request after a settings write. Settings and QAM use the same transaction.
export function useFanControl() {
  const [state, setState] = useState<FanControlState | null>(null)
  const current = useRef(state)
  const [pending, setPending] = useState<'visible' | 'silent' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const inFlight = useRef(false)
  const reading = useRef(false)
  const generation = useRef(0)
  const mounted = useRef(false)
  const reconcile = (next: FanControlState | null) => {
    current.current = next
    if (mounted.current) setState(next)
  }

  useEffect(() => {
    mounted.current = true
    const refresh = async () => {
      if (inFlight.current || reading.current) return
      reading.current = true
      const request = ++generation.current
      try {
        const next = await fanApi.status()
        if (mounted.current && request === generation.current) reconcile(next)
      } catch {
        if (mounted.current && request === generation.current) {
          reconcile(null); setNotice("Couldn't read fan control status")
        }
      } finally { reading.current = false }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 2000)
    return () => { mounted.current = false; generation.current++; clearInterval(timer) }
  }, [])

  useDeckyToastNotice(notice ? { activeKey: `fan-control:${notice}`, title: 'Fan control', body: notice, severity: 'error' } : null)

  const change = async (
    operation: (latest: FanControlState) => Promise<FanControlResult>,
    optimistic?: Partial<FanControlState>,
    feedback: 'visible' | 'silent' = 'visible',
  ) => {
    if (inFlight.current) throw new Error('A fan setting is already being applied')
    const before = current.current
    if (!before) throw new Error('Fan control is unavailable')
    // Already requested slider writes may finish after the QAM closes.
    inFlight.current = true; generation.current++
    if (mounted.current) { setPending(feedback); setNotice(null) }
    if (optimistic) reconcile({ ...before, ...optimistic })
    try {
      const result = await operation(before)
      if (!result.ok) throw new Error(result.error)
      reconcile(result.state)
      return result.state
    } catch (error) {
      try { reconcile(await fanApi.status()) } catch { reconcile(null) }
      if (mounted.current) setNotice(error instanceof Error ? error.message : "Couldn't update fan control")
      throw error
    } finally {
      inFlight.current = false
      if (mounted.current) setPending(null)
    }
  }

  return { state, saving: pending !== null, showProgress: pending === 'visible', change, mounted }
}
