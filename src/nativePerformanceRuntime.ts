import { callable } from '@decky/api'
import { findModuleExport } from '@decky/ui'
import type { NativePerformanceState } from './types/plugin'
import { NativePerformanceRestore, type NativeSelection } from './nativePerformanceRestore'

type Registration = { unregister: () => void }
type SteamSettings = {
  clientSettings: Record<string, unknown>
  GetClientSetting: (key: string) => [unknown, (value: number | boolean) => Promise<unknown>]
}
type ManagerState = {
  platform_performance_profiles_available?: string[]
  is_tdp_limit_available?: boolean
  tdp_limit_min?: number
  tdp_limit_max?: number
}
type ManagerService = {
  GetState: (request: object) => Promise<{
    BSuccess: () => boolean
    Body: () => { toObject: () => { state?: ManagerState } }
  }>
  RegisterForNotifyStateChanged: (callback: () => number) => Registration | null
}

const getBridgeStatus = callable<[], NativePerformanceState>('get_native_performance_status')

async function bounded<T>(operation: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Native performance status timed out')), timeoutMs)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

export function startNativePerformanceRuntime(): () => void {
  const settings = (window as unknown as { settingsStore?: SteamSettings }).settingsStore
  const client = window.SteamClient?.Settings as unknown as {
    RegisterForSettingsChanges?: (callback: () => void) => Registration
  }
  // Resolve by the inspected API contract, never by Steam's changing module IDs.
  const manager = findModuleExport((value: Record<string, unknown> | undefined) =>
    typeof value?.GetState === 'function' &&
    typeof value?.RegisterForNotifyStateChanged === 'function' &&
    typeof value?.RefreshScreenReaderAutoLocale === 'function',
  ) as ManagerService | undefined
  if (!settings?.GetClientSetting || !client?.RegisterForSettingsChanges || !manager) {
    console.warn('[deckyzone-native-tdp] Steam restoration API unavailable')
    return () => {}
  }

  const selection = (): NativeSelection | null => {
    const s = settings.clientSettings
    const profile = s.steamos_platform_performance_profile
    const enabled = s.steamos_tdp_limit_enabled
    const watts = s.steamos_tdp_limit
    return typeof profile === 'string' && typeof enabled === 'boolean' && typeof watts === 'number'
      ? { profile, enabled, watts } : null
  }
  const restore = new NativePerformanceRestore({
    selection,
    bridgeReady: async () => {
      const state = await bounded(getBridgeStatus(), 5000)
      if (!state.installed || !state.enabled || !state.available) return 'unavailable'
      return state.active ? 'ready' : 'starting'
    },
    replay: async (value) => {
      // The exact setter used by Steam's native QAM. It serializes only this
      // field; no profile database, per-game flag, or other setting is replaced.
      await (value.enabled
        ? settings.GetClientSetting('steamos_tdp_limit')[1](value.watts)
        : settings.GetClientSetting('steamos_tdp_limit_enabled')[1](false))
      console.info(`[deckyzone-native-tdp] Replayed saved Custom TDP: ${value.enabled ? `${value.watts} W` : 'limit off'}`)
    },
  })
  let stopped = false
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  const registrations: Registration[] = []

  const observe = async (current: number, deadline: number) => {
    try {
      const response = await bounded(manager.GetState({}), 2000)
      if (stopped || current !== generation) return
      const state = response.BSuccess() ? response.Body().toObject().state : undefined
      const selected = selection()
      if (!state || !selected) throw new Error('Native performance state unavailable')
      await restore.observe({
        ...selected,
        available: state.is_tdp_limit_available === true,
        minimum: state.tdp_limit_min ?? 0,
        maximum: state.tdp_limit_max ?? 0,
      })
      if (stopped || current !== generation || !restore.waiting) return
      if (!state.platform_performance_profiles_available?.includes('custom')) {
        restore.abandon() // Disabled/absent provider; wait for its next availability event.
        return
      }
      if (Date.now() >= deadline) {
        restore.abandon()
        console.warn('[deckyzone-native-tdp] Custom restoration timed out waiting for the bridge')
      } else {
        // Retry readiness reads only. A hardware/settings write is never retried.
        timer = setTimeout(() => void observe(current, deadline), 250)
      }
    } catch (error) {
      if (!stopped && current === generation) {
        restore.abandon()
        console.warn('[deckyzone-native-tdp] Could not restore Custom TDP', error)
      }
    }
  }
  const queue = () => {
    restore.invalidate()
    const current = ++generation
    clearTimeout(timer)
    timer = setTimeout(() => void observe(current, Date.now() + 5000), 100)
  }
  const stop = () => {
    stopped = true
    generation++
    restore.stop()
    clearTimeout(timer)
    for (const registration of registrations) registration.unregister()
  }
  try {
    registrations.push(client.RegisterForSettingsChanges(queue))
    const registration = manager.RegisterForNotifyStateChanged(() => { queue(); return 1 })
    if (!registration) throw new Error('Native performance notifications unavailable')
    registrations.push(registration)
    queue()
  } catch (error) {
    stop()
    console.warn('[deckyzone-native-tdp] Could not subscribe to Steam settings', error)
  }
  return stop
}
