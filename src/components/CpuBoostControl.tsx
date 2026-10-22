import { callable } from '@decky/api'
import { ToggleField } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import type { CpuBoostResult, CpuBoostState } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'
import { SettingsRow, useSettingsSurface } from './SettingsSurface'

const getStatus = callable<[], CpuBoostState>('get_cpu_boost_status')
const setEnabled = callable<[boolean], CpuBoostResult>('set_cpu_boost_enabled')
const EXPLAINER =
  'Allows the CPU to raise its clock speed automatically when workload, temperature, and available power permit. Applies globally and independently of the native performance profile. After you change it, your choice is saved and restored after reboot or resume. Disable PowerControl and SimpleDeckyTDP in Decky settings to use this control.'

const CpuBoostControl = () => {
  const surface = useSettingsSurface()
  const [state, setState] = useState<CpuBoostState | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const savingRef = useRef(false)
  const revision = useRef(0)
  const mounted = useRef(false)
  const conflicts = state?.conflictingPlugins ?? []

  useEffect(() => {
    mounted.current = true
    const refresh = async () => {
      if (savingRef.current) return
      const request = ++revision.current
      try {
        const next = await getStatus()
        if (mounted.current && request === revision.current) setState(next)
      } catch {
        if (mounted.current && request === revision.current) {
          setState(null)
          setNotice("Couldn't read CPU boost status")
        }
      }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 5000)
    return () => {
      mounted.current = false
      revision.current++
      clearInterval(timer)
    }
  }, [])

  useDeckyToastNotice(notice ? {
    activeKey: `cpu-boost:${notice}`,
    title: 'Performance',
    body: notice,
    severity: 'error',
  } : null)

  const change = async (enabled: boolean) => {
    if (!state || savingRef.current || !state.available || state.enabled === null
      || state.blockedReason || conflicts.length > 0 || enabled === state.enabled) return
    savingRef.current = true
    revision.current++ // Invalidate a status read started before this transaction.
    setSaving(true)
    setNotice(null)
    setState({ ...state, enabled })
    try {
      const result = await setEnabled(enabled)
      if (!mounted.current) return
      if (!result.state) throw new Error(result.error ?? "Couldn't read CPU boost status")
      setState(result.state)
      if (!result.ok) setNotice(result.error ?? "Couldn't change CPU boost")
    } catch {
      // Refetch because the write may have succeeded before its response was lost.
      try {
        const next = await getStatus()
        if (mounted.current) setState(next)
      } catch {
        if (mounted.current) setState(null)
      }
      if (mounted.current) setNotice("Couldn't confirm CPU boost")
    } finally {
      savingRef.current = false
      if (mounted.current) setSaving(false)
    }
  }

  const description = !state
    ? 'Checking availability…'
    : conflicts.length > 0
      ? `Disable ${conflicts.join(' and ')} in Decky settings`
      : state.blockedReason
        || (!state.available ? 'CPU boost is unavailable' : state.enabled === null ? 'Current CPU boost setting is unavailable' : undefined)

  return (
    <SettingsRow>
      <ToggleField
        label="CPU Boost"
        explainerTitle="CPU Boost"
        explainer={EXPLAINER}
        checked={state?.enabled ?? false}
        description={surface === 'settings' ? description : undefined}
        onChange={(value: boolean) => void change(value)}
        disabled={saving || !state || !state.available || state.enabled === null || !!state.blockedReason || conflicts.length > 0}
      />
    </SettingsRow>
  )
}

export default CpuBoostControl
