import { callable } from '@decky/api'
import { showModal } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import type { NativePerformanceResult, NativePerformanceState } from '../types/plugin'
import { nativePerformanceControlsVisible } from '../nativePerformanceRuntime'
import { showSteamRestartRequiredDialog } from '../utils/showRestartRequiredDialog'
import { useDeckyToastNotice } from '../utils/toasts'
import { SteamExplainerButtonItem, SteamExplainerToggleField } from './SteamExplainer'
import { SettingsRow } from './SettingsSurface'
import NativePerformanceProgressDialog from './NativePerformanceProgressDialog'

const getStatus = callable<[], NativePerformanceState>('get_native_performance_status')
const setEnabled = callable<[boolean], NativePerformanceResult>('set_native_performance_enabled')
const EXPLAINER =
  "Enables performance profiles and the TDP slider in Steam's Performance menu. The slider is available in Custom. Disable PowerControl and SimpleDeckyTDP in Decky settings first; their own TDP switches are not enough. Enabling either plugin later automatically turns native controls off, including startup at boot. After disabling those plugins, turn native controls back on here. Turning native controls off keeps the last applied power limits. Fan settings and CPU boost are unchanged."

const NativePerformanceControl = () => {
  const [state, setState] = useState<NativePerformanceState | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [visibleInSteam, setVisibleInSteam] = useState<boolean | null>(null)
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
        const visible = next.active ? await nativePerformanceControlsVisible() : null
        if (mounted.current && request === revision.current) {
          setState(next)
          setVisibleInSteam(visible)
        }
      } catch {
        if (mounted.current && request === revision.current) {
          setState(null)
          setNotice("Couldn't read native performance status")
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
    activeKey: `native-performance:${notice}`,
    title: 'Performance',
    body: notice,
    severity: 'error',
  } : null)

  const change = async (enabled: boolean) => {
    if (!state || savingRef.current || (enabled && (!state.available || conflicts.length > 0))) return
    savingRef.current = true
    revision.current++ // Invalidate a status read started before this transaction.
    setSaving(true)
    setNotice(null)
    setVisibleInSteam(null)
    setState({ ...state, enabled })
    let progressTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const operation = setEnabled(enabled)
      progressTimer = setTimeout(() => {
        showModal(<NativePerformanceProgressDialog operation={operation} message={
          enabled
            ? state.needsSetup
              ? state.installed ? 'Repairing native performance controls…' : 'Installing native performance controls…'
              : 'Starting native performance controls…'
            : 'Stopping native performance controls…'
        } />)
      }, 600)
      const result = await operation
      clearTimeout(progressTimer)
      if (!mounted.current) return
      if (!result.state) throw new Error(result.error ?? "Couldn't read bridge status")
      setState(result.state)
      if (result.ok && result.state.active) {
        const visible = await nativePerformanceControlsVisible()
        if (mounted.current) setVisibleInSteam(visible)
      }
      if (!result.ok) setNotice(result.error ?? "Couldn't change native performance controls")
    } catch {
      // Refetch the authoritative state; the command may have reached systemd
      // even if its response was lost. Never roll back unrelated settings.
      try {
        const next = await getStatus()
        if (mounted.current) setState(next)
      } catch {
        if (mounted.current) setState(null)
      }
      if (mounted.current) setNotice("Couldn't confirm native performance controls")
    } finally {
      clearTimeout(progressTimer)
      savingRef.current = false
      if (mounted.current) setSaving(false)
    }
  }

  const description = saving
    ? 'Applying change…'
    : !state
      ? 'Checking availability…'
      : conflicts.length > 0
        ? `Disable ${conflicts.join(' and ')} in Decky settings`
        : state.blockedReason
          ? `${state.enabled && !state.active ? 'Stopped: ' : ''}${state.blockedReason}`
          : state.needsSetup
            ? state.enabled
              ? 'Turn off and on to repair native controls'
              : state.installed ? 'Enable to repair native controls' : 'Enable to install native controls'
          : state.active
            ? visibleInSteam === false
              ? 'Restart Steam to show native controls'
              : visibleInSteam === null ? "Checking Steam's controls…" : "Use Steam's Performance menu"
            : "Adds profiles and TDP control to Steam's Performance menu"

  return (
    <>
      <SettingsRow>
        <SteamExplainerToggleField
          label="Native Performance Controls"
          explainerTitle="Native Performance Controls"
          explainer={EXPLAINER}
          checked={state?.enabled ?? false}
          settingsDescription={description}
          onChange={(value: boolean) => void change(value)}
          disabled={saving || !state || (!state.enabled && (!state.available || conflicts.length > 0))}
        />
      </SettingsRow>
      {state?.active && visibleInSteam === false && !saving && (
        <SettingsRow>
          <SteamExplainerButtonItem label="Native controls" layout="below" onClick={showSteamRestartRequiredDialog}>
            Restart Steam
          </SteamExplainerButtonItem>
        </SettingsRow>
      )}
    </>
  )
}

export default NativePerformanceControl
