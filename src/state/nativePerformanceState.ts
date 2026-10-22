import { callable } from '@decky/api'
import type { NativePerformanceState } from '../types/plugin'

const getStatus = callable<[], NativePerformanceState>('get_native_performance_status')
type Snapshot = {
  state: NativePerformanceState | null
  checking: boolean
  confirmed: boolean
  saving: boolean
}

let snapshot: Snapshot = { state: null, checking: false, confirmed: false, saving: false }
let revision = 0
let pendingRead: Promise<NativePerformanceState | null> | null = null
const listeners = new Set<() => void>()
const publish = (next: Snapshot) => {
  snapshot = next
  listeners.forEach(listener => listener())
}

// The saved value survives settings/QAM remounts, including failed refreshes.
export const getNativePerformanceSnapshot = () => snapshot
export const subscribeNativePerformance = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function refreshNativePerformanceStatus(recoveringWrite = false): Promise<NativePerformanceState | null> {
  if (snapshot.saving && !recoveringWrite) return Promise.resolve(null)
  if (pendingRead) return pendingRead
  const request = ++revision
  publish({ ...snapshot, checking: true, confirmed: false })
  const operation = getStatus().then(next => {
    if (request !== revision) return null
    publish({ ...snapshot, state: next, checking: false, confirmed: true })
    return next
  }, error => {
    if (request === revision) publish({ ...snapshot, checking: false, confirmed: false })
    throw error
  }).finally(() => {
    if (pendingRead === operation) pendingRead = null
  })
  pendingRead = operation
  return operation
}

export async function warmNativePerformanceStatus() {
  try { await refreshNativePerformanceStatus() } catch { /* A mounted control retries and reports failures. */ }
}

// Invalidate reads before the optimistic write; all mounted controls share the lock.
export function beginNativePerformanceChange(enabled: boolean): NativePerformanceState | null {
  const state = snapshot.state
  if (!state || snapshot.saving || snapshot.checking || !snapshot.confirmed) return null
  revision++
  pendingRead = null
  publish({ ...snapshot, state: { ...state, enabled }, saving: true, confirmed: false })
  return state
}

export function confirmNativePerformanceState(state: NativePerformanceState) {
  revision++
  pendingRead = null
  publish({ ...snapshot, state, checking: false, confirmed: true })
}

export function finishNativePerformanceChange() {
  publish({ ...snapshot, saving: false })
}
