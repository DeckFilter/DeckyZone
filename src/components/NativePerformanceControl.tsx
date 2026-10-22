import { callable } from '@decky/api'
import { ButtonItem, ToggleField, showModal } from '@decky/ui'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { NativePerformanceResult } from '../types/plugin'
import { nativePerformanceControlsVisible, subscribeNativePerformanceControlsVisibility } from '../nativePerformanceRuntime'
import {
  beginNativePerformanceChange,
  confirmNativePerformanceState,
  finishNativePerformanceChange,
  getNativePerformanceSnapshot,
  refreshNativePerformanceStatus,
  subscribeNativePerformance,
} from '../state/nativePerformanceState'
import { showSteamRestartRequiredDialog } from '../utils/showRestartRequiredDialog'
import { useDeckyToastNotice } from '../utils/toasts'
import { SettingsRow } from './SettingsSurface'
import NativePerformanceProgressDialog from './NativePerformanceProgressDialog'

const setEnabled = callable<[boolean], NativePerformanceResult>('set_native_performance_enabled')
const EXPLAINER =
  "Enables performance profiles and the TDP slider in Steam's Performance menu. The slider is available in Custom. Disable PowerControl and SimpleDeckyTDP in Decky settings first; their own TDP switches are not enough. Enabling either plugin later automatically turns native controls off, including startup at boot. After disabling those plugins, turn native controls back on here. Turning native controls off keeps the last applied power limits. Fan settings and CPU boost are unchanged."

const NativePerformanceControl = () => {
  const { state, saving, checking, confirmed, error } = useSyncExternalStore(
    subscribeNativePerformance, getNativePerformanceSnapshot,
  )
  const [notice, setNotice] = useState<string | null>(null)
  const [visibleInSteam, setVisibleInSteam] = useState<boolean | null>(null)
  const mounted = useRef(false)
  const conflicts = state?.conflictingPlugins ?? []

  useEffect(() => {
    mounted.current = true
    void refreshNativePerformanceStatus().catch(() => {})
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    setVisibleInSteam(null)
    if (!state?.active || saving) return
    let cancelled = false
    let revision = 0
    let retries = 0
    let timer: ReturnType<typeof setTimeout> | undefined
    const refresh = async () => {
      const request = ++revision
      const visible = await nativePerformanceControlsVisible()
      if (cancelled || request !== revision) return
      setVisibleInSteam(visible)
      if (visible === null && retries < 3) {
        timer = setTimeout(() => void refresh(), [1000, 2000, 5000][retries++])
      }
    }
    // This only reads Steam's published capabilities; it never runs the full backend check.
    const unsubscribe = subscribeNativePerformanceControlsVisibility(() => {
      revision++
      retries = 0
      clearTimeout(timer)
      timer = setTimeout(() => void refresh(), 100)
    })
    void refresh()
    return () => { cancelled = true; revision++; clearTimeout(timer); unsubscribe() }
  }, [state?.active, saving])

  const currentNotice = notice ?? error
  useDeckyToastNotice(currentNotice ? {
    activeKey: `native-performance:${currentNotice}`,
    title: 'Performance',
    body: currentNotice,
    severity: 'error',
  } : null)

  const change = async (enabled: boolean) => {
    if (!state || checking || (enabled && (!state.available || conflicts.length > 0))) return
    const before = beginNativePerformanceChange(enabled)
    if (!before) return
    setNotice(null)
    setVisibleInSteam(null)
    let progressTimer: ReturnType<typeof setTimeout> | undefined
    try {
      const operation = setEnabled(enabled)
      progressTimer = setTimeout(() => {
        showModal(<NativePerformanceProgressDialog operation={operation} message={
          enabled
            ? before.needsSetup
              ? before.installed ? 'Repairing native performance controls…' : 'Installing native performance controls…'
              : 'Starting native performance controls…'
            : 'Stopping native performance controls…'
        } />)
      }, 600)
      const result = await operation
      clearTimeout(progressTimer)
      if (!result.state) throw new Error(result.error ?? "Couldn't read bridge status")
      confirmNativePerformanceState(result.state)
      if (!mounted.current) return
      if (!result.ok) setNotice(result.error ?? "Couldn't change native performance controls")
    } catch {
      // Refetch the authoritative state; the command may have reached systemd
      // even if its response was lost. Never roll back unrelated settings.
      try {
        await refreshNativePerformanceStatus(true)
      } catch { /* Keep the last position disabled until a successful status read. */ }
      if (mounted.current) setNotice("Couldn't confirm native performance controls")
    } finally {
      clearTimeout(progressTimer)
      finishNativePerformanceChange()
    }
  }

  return (
    <>
      <SettingsRow>
        <ToggleField
          label="Native Performance Controls"
          explainerTitle="Native Performance Controls"
          explainer={EXPLAINER}
          checked={state?.enabled ?? false}
          onChange={(value: boolean) => void change(value)}
          disabled={saving || checking || !confirmed || !state || (!state.enabled && (!state.available || conflicts.length > 0))}
        />
      </SettingsRow>
      {error && !saving && (
        <SettingsRow>
          <ButtonItem label="Native controls" layout="below" disabled={checking}
            onClick={() => { setNotice(null); void refreshNativePerformanceStatus().catch(() => {}) }}>
            {checking ? 'Checking…' : 'Retry status'}
          </ButtonItem>
        </SettingsRow>
      )}
      {state?.active && visibleInSteam === false && !saving && (
        <SettingsRow>
          <ButtonItem label="Native controls" layout="below" onClick={showSteamRestartRequiredDialog}>
            Restart Steam
          </ButtonItem>
        </SettingsRow>
      )}
    </>
  )
}

export default NativePerformanceControl
