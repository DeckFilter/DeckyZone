import { callable } from '@decky/api'
import { ButtonItem, ToggleField, showModal } from '@decky/ui'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { NativePerformanceResult } from '../types/plugin'
import { nativePerformanceControlsVisible } from '../nativePerformanceRuntime'
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
import { SettingsRow, useSettingsSurface } from './SettingsSurface'
import NativePerformanceProgressDialog from './NativePerformanceProgressDialog'

const setEnabled = callable<[boolean], NativePerformanceResult>('set_native_performance_enabled')
const EXPLAINER =
  "Enables performance profiles and the TDP slider in Steam's Performance menu. The slider is available in Custom. Disable PowerControl and SimpleDeckyTDP in Decky settings first; their own TDP switches are not enough. Enabling either plugin later automatically turns native controls off, including startup at boot. After disabling those plugins, turn native controls back on here. Turning native controls off keeps the last applied power limits. Fan settings and CPU boost are unchanged."

const NativePerformanceControl = () => {
  const surface = useSettingsSurface()
  const { state, saving, checking: sharedChecking, confirmed } = useSyncExternalStore(
    subscribeNativePerformance, getNativePerformanceSnapshot,
  )
  const [checking, setChecking] = useState(true)
  const [notice, setNotice] = useState<string | null>(null)
  const [visibleInSteam, setVisibleInSteam] = useState<boolean | null>(null)
  const revision = useRef(0)
  const mounted = useRef(false)
  const conflicts = state?.conflictingPlugins ?? []

  useEffect(() => {
    mounted.current = true
    const refresh = async () => {
      if (getNativePerformanceSnapshot().saving) {
        setChecking(false)
        return
      }
      const request = ++revision.current
      setChecking(true)
      try {
        const next = await refreshNativePerformanceStatus()
        if (!next) return
        const visible = next.active ? await nativePerformanceControlsVisible() : null
        if (mounted.current && request === revision.current) {
          setVisibleInSteam(visible)
        }
      } catch {
        if (mounted.current && request === revision.current) {
          setNotice("Couldn't read native performance status")
        }
      } finally {
        if (mounted.current && request === revision.current) setChecking(false)
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
    if (!state || checking || (enabled && (!state.available || conflicts.length > 0))) return
    const before = beginNativePerformanceChange(enabled)
    if (!before) return
    revision.current++ // Invalidate a status read started before this transaction.
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
      if (result.ok && result.state.active) {
        const visible = await nativePerformanceControlsVisible()
        if (mounted.current) setVisibleInSteam(visible)
      }
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

  const description = saving
    ? 'Applying change…'
    : checking || sharedChecking
      ? 'Checking availability…'
      : !state
        ? 'Checking availability…'
        : !confirmed
          ? "Couldn't confirm native performance status"
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
        <ToggleField
          label="Native Performance Controls"
          explainerTitle="Native Performance Controls"
          explainer={EXPLAINER}
          checked={state?.enabled ?? false}
          description={surface === 'settings' ? description : undefined}
          onChange={(value: boolean) => void change(value)}
          disabled={saving || checking || sharedChecking || !confirmed || !state || (!state.enabled && (!state.available || conflicts.length > 0))}
        />
      </SettingsRow>
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
