import { addEventListener, callable, removeEventListener } from '@decky/api'
import { useSyncExternalStore } from 'react'
import type { PluginUpdateStatus, ReleaseTarget, UpdateChannel } from '../types/plugin'
import { closeRestartNotice, showRestartNotice } from './showRestartRequiredDialog'
import { showDeckyToast } from './toasts'
import { beginUpdateOperation } from './updateOperations'

const getStatus = callable<[], PluginUpdateStatus>('get_plugin_update_status')
const prepareUpdate = callable<[UpdateChannel, ReleaseTarget], PluginUpdateStatus>('prepare_plugin_update')
const activateUpdate = callable<[], PluginUpdateStatus>('activate_plugin_update')

export const MINIMUM_APPLY_DURATION_MS = 30000

type UpdateState = {
  status: PluginUpdateStatus | null
  automaticRestart: boolean
  action: 'prepare' | 'activate' | 'refresh' | null
  applyUntil: number | null
  error: string | null
}

let state: UpdateState = { status: null, automaticRestart: false, action: null, applyUntil: null, error: null }
let generation = 0
let cancelActivation: (() => void) | null = null
let cancelApplyDelay: (() => void) | null = null
const listeners = new Set<() => void>()
const getSnapshot = () => state
const publish = (next: UpdateState) => {
  state = next
  listeners.forEach((listener) => listener())
}
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

const applyStatus = (status: PluginUpdateStatus) => {
  if (state.status && status.revision <= state.status.revision) return
  publish({ ...state, status, error: null })
}

export function initializePluginUpdateStatus() {
  const currentGeneration = ++generation
  publish({ status: null, automaticRestart: false, action: null, applyUntil: null, error: null })
  const listener = addEventListener<[PluginUpdateStatus]>('plugin_update_status', (status) => {
    if (currentGeneration === generation) applyStatus(status)
  })
  // Subscribe first so a slower initial read cannot replace a newer progress event.
  void getStatus().then((status) => {
    if (currentGeneration === generation) applyStatus(status)
  }).catch((error) => {
    console.error('Could not load plugin update status', error)
  })
  return () => {
    removeEventListener('plugin_update_status', listener)
    if (currentGeneration !== generation) return
    generation += 1
    cancelApplyDelay?.()
    cancelActivation?.()
    closeRestartNotice()
  }
}

export const usePluginUpdateState = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

const hasBusyPhase = (snapshot: UpdateState) => ['checking', 'downloading', 'staging', 'restarting'].includes(snapshot.status?.phase ?? '')
export const needsPluginUpdateStatusRefresh = (snapshot: UpdateState) => snapshot.action === null && snapshot.error !== null && hasBusyPhase(snapshot)
export const isPluginUpdateBusy = (snapshot: UpdateState) => snapshot.action !== null || (snapshot.error === null && hasBusyPhase(snapshot))

export function setAutomaticPluginRestart(automaticRestart: boolean) {
  publish({ ...state, automaticRestart })
}

export async function refreshPluginUpdateStatus() {
  if (state.action) return
  const releaseOperation = beginUpdateOperation()
  if (!releaseOperation) return
  const currentGeneration = generation
  publish({ ...state, action: 'refresh' })
  try {
    const status = await new Promise<PluginUpdateStatus>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Update status timed out')), 3000)
      void getStatus().then((value) => { clearTimeout(timeout); resolve(value) }, (error) => { clearTimeout(timeout); reject(error) })
    })
    if (currentGeneration !== generation) return
    applyStatus(status)
    publish({ ...state, error: hasBusyPhase(state) ? 'Decky Loader is still restarting' : null })
  } catch (error) {
    if (currentGeneration !== generation) return
    const message = 'Couldn’t check update status. Try again.'
    publish({ ...state, error: message })
    showDeckyToast({ title: 'Updates', body: message, severity: 'error' })
  } finally {
    if (currentGeneration === generation) publish({ ...state, action: null })
    releaseOperation()
  }
}

function waitForActivation(currentGeneration: number) {
  return new Promise<void>((resolve, reject) => {
    const startingRevision = state.status?.revision ?? -1
    let finished = false
    let activationSettled = false
    let pollTimer: ReturnType<typeof setTimeout>
    let requestTimer: ReturnType<typeof setTimeout>
    const finish = (error?: Error) => {
      if (finished) return
      finished = true
      clearTimeout(pollTimer)
      clearTimeout(requestTimer)
      clearTimeout(deadlineTimer)
      if (cancelActivation === cancel) cancelActivation = null
      if (error) reject(error)
      else resolve()
    }
    const cancel = () => finish()
    const deadlineTimer = setTimeout(() => finish(new Error('The Decky Loader restart timed out')), 90000)
    cancelActivation = cancel
    const accept = (status: PluginUpdateStatus) => {
      if (finished || currentGeneration !== generation || status.revision < (state.status?.revision ?? -1)) return
      applyStatus(status)
      if (status.phase === 'idle') {
        closeRestartNotice()
        finish()
      } else if (status.phase === 'error'
        || (status.phase === 'ready' && (activationSettled || status.revision > startingRevision))) {
        finish(new Error(status.error ?? 'Decky Loader did not restart'))
      }
    }
    const schedule = () => {
      if (!finished) pollTimer = setTimeout(poll, 1000)
    }
    const poll = () => {
      if (finished || currentGeneration !== generation) return finish()
      let settled = false
      const next = () => {
        if (settled) return
        settled = true
        clearTimeout(requestTimer)
        schedule()
      }
      // A disconnected Loader RPC must not hold the restart notice indefinitely.
      requestTimer = setTimeout(next, 3000)
      void getStatus().then((status) => {
        if (!settled) accept(status)
        next()
      }).catch(next)
    }
    // The installer runs outside Decky. Reconcile only during this explicit restart,
    // using the same busy-only status pattern as InputPlumberUpdateControls.
    void activateUpdate().then((status) => {
      activationSettled = true
      accept(status)
    }).catch(() => { activationSettled = true })
    schedule()
  })
}

export async function activatePreparedUpdate() {
  if (isPluginUpdateBusy(state) || state.status?.phase !== 'ready') return false
  const releaseOperation = beginUpdateOperation()
  if (!releaseOperation) return false
  const currentGeneration = generation
  publish({ ...state, action: 'activate', error: null })
  try {
    await showRestartNotice('Decky Loader', async () => {
      if (currentGeneration !== generation) return
      await waitForActivation(currentGeneration)
    })
    return currentGeneration === generation
  } catch (error) {
    if (currentGeneration !== generation) return false
    const message = hasBusyPhase(state)
      ? 'Couldn’t confirm the Decky Loader restart. Check its status again.'
      : 'Couldn’t install this release. Try again.'
    publish({ ...state, error: message })
    showDeckyToast({ title: 'Updates', body: message, severity: 'error' })
    throw error
  } finally {
    if (currentGeneration === generation) publish({ ...state, action: null })
    releaseOperation()
  }
}

function waitForApplyWindow(deadline: number) {
  const remaining = deadline - performance.now()
  if (remaining <= 0) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timer)
      if (cancelApplyDelay === finish) cancelApplyDelay = null
      resolve()
    }
    const timer = setTimeout(finish, remaining)
    cancelApplyDelay = finish
  })
}

export async function startPluginUpdate(channel: UpdateChannel, target: ReleaseTarget) {
  if (state.action || hasBusyPhase(state)) return false
  const releaseOperation = beginUpdateOperation()
  if (!releaseOperation) return false
  const currentGeneration = generation
  const applyUntil = performance.now() + MINIMUM_APPLY_DURATION_MS
  publish({ ...state, action: 'prepare', applyUntil, error: null })
  try {
    const status = await prepareUpdate(channel, target)
    if (currentGeneration !== generation) return false
    applyStatus(status)
    if (status.phase !== 'ready') throw new Error(status.error ?? 'Preparation failed')
    // Keep the automatic-restart choice available even for tiny plugin downloads.
    await waitForApplyWindow(applyUntil)
  } catch (error) {
    if (currentGeneration !== generation) return false
    const message = 'Couldn’t prepare this release. Check for updates and try again.'
    publish({ ...state, error: message })
    showDeckyToast({ title: 'Updates', body: message, severity: 'error' })
    throw error
  } finally {
    if (currentGeneration === generation) publish({ ...state, action: null, applyUntil: null })
    releaseOperation()
  }
  if (currentGeneration !== generation) return false
  if (state.automaticRestart) return activatePreparedUpdate()
  return true
}
