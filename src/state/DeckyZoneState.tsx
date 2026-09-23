import { createContext, type ReactNode, useContext, useSyncExternalStore } from 'react'
import type { ActiveGame, PluginSettings, PluginStatus } from '../types/plugin'

export type PluginSettingsUpdate =
  | PluginSettings
  | ((currentSettings: PluginSettings) => PluginSettings)

export type BootstrapSnapshot = {
  status: PluginStatus
  settings: PluginSettings
}

export type BootstrapState =
  | { state: 'loading' }
  | { state: 'ready'; snapshot: BootstrapSnapshot }
  | { state: 'error'; message: string }

type DeckyZoneStateSnapshot = {
  bootstrap: BootstrapState
  activeGame: ActiveGame | null
  settingsRevision: number
  uiRevision: number
}

type SettingsChangedHandler = (settings: PluginSettings) => void
type Listener = () => void

export class DeckyZoneState {
  private listeners = new Set<Listener>()
  private snapshot: DeckyZoneStateSnapshot = {
    bootstrap: { state: 'loading' },
    activeGame: null,
    settingsRevision: 0,
    uiRevision: 0,
  }

  constructor(private readonly onSettingsChanged: SettingsChangedHandler) {}

  getSnapshot = () => this.snapshot

  subscribe = (listener: Listener) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  setLoading() {
    this.publish({
      ...this.snapshot,
      bootstrap: { state: 'loading' },
    })
  }

  setError(message: string) {
    this.publish({
      ...this.snapshot,
      bootstrap: { state: 'error', message },
    })
  }

  setReady(status: PluginStatus, settings: PluginSettings) {
    this.onSettingsChanged(settings)
    this.publish({
      ...this.snapshot,
      bootstrap: {
        state: 'ready',
        snapshot: { status, settings },
      },
      settingsRevision: this.snapshot.settingsRevision + 1,
    })
  }

  updateStatus(status: PluginStatus) {
    if (this.snapshot.bootstrap.state !== 'ready') {
      return
    }

    this.publish({
      ...this.snapshot,
      bootstrap: {
        state: 'ready',
        snapshot: {
          ...this.snapshot.bootstrap.snapshot,
          status,
        },
      },
    })
  }

  updateSettings(update: PluginSettingsUpdate) {
    if (this.snapshot.bootstrap.state !== 'ready') {
      return
    }

    const currentSettings = this.snapshot.bootstrap.snapshot.settings
    const settings = typeof update === 'function' ? update(currentSettings) : update
    this.onSettingsChanged(settings)
    this.publish({
      ...this.snapshot,
      bootstrap: {
        state: 'ready',
        snapshot: {
          ...this.snapshot.bootstrap.snapshot,
          settings,
        },
      },
      settingsRevision: this.snapshot.settingsRevision + 1,
    })
  }

  setActiveGame(activeGame: ActiveGame | null) {
    this.publish({
      ...this.snapshot,
      activeGame,
    })
  }

  bumpUiRevision() {
    this.publish({
      ...this.snapshot,
      uiRevision: this.snapshot.uiRevision + 1,
    })
  }

  reset() {
    this.snapshot = {
      bootstrap: { state: 'loading' },
      activeGame: null,
      settingsRevision: 0,
      uiRevision: 0,
    }
    this.emit()
  }

  private publish(snapshot: DeckyZoneStateSnapshot) {
    this.snapshot = snapshot
    this.emit()
  }

  private emit() {
    this.listeners.forEach((listener) => listener())
  }
}

type DeckyZoneStateContextValue = {
  snapshot: DeckyZoneStateSnapshot
  store: DeckyZoneState
}

const DeckyZoneStateContext = createContext<DeckyZoneStateContextValue | null>(null)

type DeckyZoneStateProviderProps = {
  children: ReactNode
  store: DeckyZoneState
}

export const DeckyZoneStateProvider = ({ children, store }: DeckyZoneStateProviderProps) => {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot)

  return (
    <DeckyZoneStateContext.Provider value={{ snapshot, store }}>
      {children}
    </DeckyZoneStateContext.Provider>
  )
}

export const useDeckyZoneState = () => {
  const context = useContext(DeckyZoneStateContext)
  if (!context) {
    throw new Error('DeckyZoneStateProvider is missing')
  }

  return {
    ...context.snapshot,
    store: context.store,
  }
}
