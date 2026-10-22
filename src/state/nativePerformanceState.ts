import { addEventListener, callable, removeEventListener } from '@decky/api'
import type { NativePerformanceState } from '../types/plugin'

const getStatus = callable<[], NativePerformanceState>('get_native_performance_status')
type Snapshot = {
  state: NativePerformanceState | null
  checking: boolean
  confirmed: boolean
  saving: boolean
  error: string | null
}

const STATUS_CHANGED = 'native_performance_status_changed'
const RETRY_DELAYS = [1000, 2000, 5000]
let snapshot: Snapshot = { state: null, checking: false, confirmed: false, saving: false, error: null }
let revision = 0
let pendingRead: Promise<NativePerformanceState | null> | null = null
let running = false
let eventDirty = false
let retryAttempt = 0
let eventTimer: ReturnType<typeof setTimeout> | undefined
let retryTimer: ReturnType<typeof setTimeout> | undefined
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

const queueEventRead = () => {
  if (!running || snapshot.saving || pendingRead) return
  clearTimeout(eventTimer)
  eventTimer = setTimeout(() => {
    eventTimer = undefined
    void warmNativePerformanceStatus()
  }, 100)
}

const retryFailedRead = () => {
  if (!running || retryAttempt >= RETRY_DELAYS.length) return
  retryTimer = setTimeout(() => {
    retryTimer = undefined
    void readStatus().catch(() => {})
  }, RETRY_DELAYS[retryAttempt++])
}

function readStatus(recoveringWrite = false): Promise<NativePerformanceState | null> {
  if (snapshot.saving && !recoveringWrite) return Promise.resolve(null)
  if (pendingRead) return pendingRead
  clearTimeout(eventTimer)
  eventTimer = undefined
  eventDirty = false
  const request = ++revision
  // Routine refreshes keep the last confirmed setting interactive.
  if (!snapshot.confirmed) publish({ ...snapshot, checking: true })
  const operation = getStatus().then(next => {
    if (request !== revision) return null
    retryAttempt = 0
    publish({ ...snapshot, state: next, checking: false, confirmed: true, error: null })
    return next
  }, error => {
    if (request !== revision) return null
    publish({ ...snapshot, checking: false, confirmed: false, error: "Couldn't read native performance status" })
    retryFailedRead()
    throw error
  }).finally(() => {
    if (pendingRead === operation) {
      pendingRead = null
      if (eventDirty) queueEventRead()
    }
  })
  pendingRead = operation
  return operation
}

export function refreshNativePerformanceStatus(recoveringWrite = false) {
  retryAttempt = 0
  clearTimeout(retryTimer)
  return readStatus(recoveringWrite)
}

export async function warmNativePerformanceStatus() {
  try { await refreshNativePerformanceStatus() } catch { /* The snapshot reports failures and bounded retries recover them. */ }
}

export function startNativePerformanceStatus() {
  running = true
  // Subscribe before the initial read so a change during startup invalidates it.
  const listener = addEventListener<[]>(STATUS_CHANGED, () => {
    revision++
    eventDirty = true
    retryAttempt = 0
    clearTimeout(retryTimer)
    queueEventRead()
  })
  void warmNativePerformanceStatus()
  return () => {
    running = false
    revision++
    pendingRead = null
    clearTimeout(eventTimer)
    clearTimeout(retryTimer)
    removeEventListener<[]>(STATUS_CHANGED, listener)
  }
}

// Invalidate reads before the optimistic write; all mounted controls share the lock.
export function beginNativePerformanceChange(enabled: boolean): NativePerformanceState | null {
  const state = snapshot.state
  if (!state || snapshot.saving || snapshot.checking || !snapshot.confirmed) return null
  revision++
  pendingRead = null
  clearTimeout(eventTimer)
  clearTimeout(retryTimer)
  publish({ ...snapshot, state: { ...state, enabled }, saving: true, confirmed: false, error: null })
  return state
}

export function confirmNativePerformanceState(state: NativePerformanceState) {
  revision++
  pendingRead = null
  clearTimeout(retryTimer)
  retryAttempt = 0
  publish({ ...snapshot, state, checking: false, confirmed: true, error: null })
}

export function finishNativePerformanceChange() {
  publish({ ...snapshot, saving: false })
  if (eventDirty) queueEventRead()
}
