import { callable } from '@decky/api'
import { useEffect, useRef, useState } from 'react'
import type { PluginSettingsUpdate } from '../../state/DeckyZoneState'
import type { PerGameSettings, PluginSettings } from '../../types/plugin'
import { showDeckyToast } from '../../utils/toasts'

export type GameControllerSettingsPatch = Partial<Pick<
  PerGameSettings,
  'enabled' | 'buttonPromptFixEnabled' | 'rumbleEnabled' | 'rumbleIntensity'
>>
type SettingKey = keyof GameControllerSettingsPatch
type Props = {
  appId: string
  settings: PluginSettings
  onSettingsChange: (update: PluginSettingsUpdate) => void
  mode?: 'dedicated' | 'quick-access' | 'global'
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}
type SaveBaseline = {
  values: GameControllerSettingsPatch
  entry?: PerGameSettings
  pending: number
}
type Edit = {
  appId: string
  patch: GameControllerSettingsPatch
  baseline: SaveBaseline
  optimisticEntry?: PerGameSettings
  tokens: Partial<Record<SettingKey, number>>
  version: number
}

const getSettings = callable<[], PluginSettings>('get_settings')
const updateGameSettings = callable<[string, GameControllerSettingsPatch], PluginSettings>('update_game_controller_settings')
const setRumbleEnabled = callable<[boolean], PluginSettings>('set_rumble_enabled')
const setRumbleIntensity = callable<[number], PluginSettings>('set_rumble_intensity')
const testRumble = callable<[string?], boolean>('test_rumble')
const settingKeys: SettingKey[] = ['enabled', 'buttonPromptFixEnabled', 'rumbleEnabled', 'rumbleIntensity']
const fieldVersions = new Map<string, number>()
const saveBaselines = new Map<string, SaveBaseline>()
const pendingFlushers = new Set<(appId: string) => Promise<boolean>>()
let mutationVersion = 0
let saveChain: Promise<unknown> = Promise.resolve()

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = saveChain.catch(() => undefined).then(task)
  saveChain = result
  return result
}

export async function awaitGameControllerSaves(appId: string): Promise<void> {
  await Promise.all([...pendingFlushers].map((flush) => flush(appId)))
  await saveChain.catch(() => undefined)
}

function defaultGameSettings(settings: PluginSettings): PerGameSettings {
  return {
    enabled: false,
    buttonPromptFixEnabled: false,
    trackpadMode: settings.trackpadMode,
    rumbleEnabled: settings.rumbleEnabled,
    rumbleIntensity: settings.rumbleIntensity,
    m1RemapTarget: 'none',
    m2RemapTarget: 'none',
  }
}

function isCurrentField(edit: Edit, key: SettingKey) {
  return fieldVersions.get(`${edit.appId}:${key}`) === edit.tokens[key]
}

function updateBaseline(edit: Edit, settings: PluginSettings) {
  edit.baseline.entry = edit.appId === '0' ? undefined : settings.perGameSettings[edit.appId]
  edit.baseline.values = edit.appId === '0'
    ? { rumbleEnabled: settings.rumbleEnabled, rumbleIntensity: settings.rumbleIntensity }
    : edit.baseline.entry ?? defaultGameSettings(settings)
}

function reconcileEdit(current: PluginSettings, edit: Edit, failed = false): PluginSettings {
  let keys = (Object.keys(edit.patch) as SettingKey[]).filter((key) => isCurrentField(edit, key))
  if (!keys.length) return current
  if (edit.appId === '0') {
    const patch = Object.fromEntries(keys.map((key) => [key, edit.baseline.values[key]]))
    return { ...current, ...patch }
  }

  const currentEntry = current.perGameSettings[edit.appId]
  if (!currentEntry) return current
  const perGameSettings = { ...current.perGameSettings }
  const newerEditExists = settingKeys
    .some((key) => (fieldVersions.get(`${edit.appId}:${key}`) ?? 0) > edit.version)
  const unownedFieldsChanged = (Object.keys(currentEntry) as (keyof PerGameSettings)[])
    .some((key) => !settingKeys.includes(key as SettingKey) && currentEntry[key] !== edit.optimisticEntry?.[key])
  if (failed && !edit.baseline.entry && !newerEditExists && !unownedFieldsChanged) {
    delete perGameSettings[edit.appId]
  } else {
    if (failed && currentEntry.controllerMapping !== edit.optimisticEntry?.controllerMapping) {
      keys = keys.filter((key) => key !== 'enabled')
    }
    const patch = Object.fromEntries(keys.map((key) => [key, edit.baseline.values[key]]))
    perGameSettings[edit.appId] = { ...currentEntry, ...patch }
  }
  return { ...current, perGameSettings }
}

export default function useGameControllerSettings({
  appId,
  settings,
  onSettingsChange,
  mode = 'dedicated',
  disabled = false,
  onBusyChange,
}: Props) {
  const refs = useRef({ settings, onSettingsChange, disabled, onBusyChange })
  refs.current = { settings, onSettingsChange, disabled, onBusyChange }
  const mounted = useRef(true)
  const pendingIntensity = useRef<Edit | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inFlight = useRef(0)
  const testing = useRef(false)
  const [saving, setSaving] = useState(false)
  const [testingRumble, setTestingRumble] = useState(false)
  const [hasPendingIntensity, setHasPendingIntensity] = useState(false)
  const gameSettings = appId === '0' ? undefined : settings.perGameSettings[appId]
  const rumbleAppId = mode === 'global' || (mode === 'quick-access' && !gameSettings?.enabled) ? '0' : appId
  const rumbleSettings = rumbleAppId === '0' ? settings : settings.perGameSettings[rumbleAppId] ?? settings

  const publish = (update: (current: PluginSettings) => PluginSettings) => {
    refs.current.onSettingsChange((current) => {
      const next = update(current)
      refs.current.settings = next
      return next
    })
  }

  const createEdit = (target: string, values: GameControllerSettingsPatch, previousEdit?: Edit): Edit => {
    const patch = target === '0' ? values : { enabled: true, ...values }
    const version = ++mutationVersion
    const tokens = Object.fromEntries((Object.keys(patch) as SettingKey[]).map((key) => {
      const field = `${target}:${key}`
      fieldVersions.set(field, version)
      return [key, version]
    }))
    let edit!: Edit
    publish((current) => {
      const entry = target === '0' ? undefined : current.perGameSettings[target]
      const baseline = previousEdit?.baseline ?? saveBaselines.get(target) ?? {
        values: target === '0'
          ? { rumbleEnabled: current.rumbleEnabled, rumbleIntensity: current.rumbleIntensity }
          : entry ?? defaultGameSettings(current),
        entry,
        pending: 0,
      }
      if (!previousEdit) baseline.pending += 1
      saveBaselines.set(target, baseline)
      edit = { appId: target, patch, baseline, tokens, version }
      if (target === '0') return { ...current, ...patch }
      edit.optimisticEntry = { ...(entry ?? defaultGameSettings(current)), ...patch }
      return { ...current, perGameSettings: { ...current.perGameSettings, [target]: edit.optimisticEntry } }
    })
    return edit
  }

  const saveEdit = (edit: Edit): Promise<boolean> => {
    inFlight.current += 1
    if (mounted.current) setSaving(true)
    return enqueue(async () => {
      try {
        const next = edit.appId !== '0'
          ? await updateGameSettings(edit.appId, edit.patch)
          : edit.patch.rumbleIntensity !== undefined
            ? await setRumbleIntensity(edit.patch.rumbleIntensity)
            : await setRumbleEnabled(edit.patch.rumbleEnabled!)
        updateBaseline(edit, next)
        publish((current) => reconcileEdit(current, edit))
        return true
      } catch {
        const authoritative = await getSettings().catch(() => undefined)
        if (authoritative) updateBaseline(edit, authoritative)
        publish((current) => reconcileEdit(current, edit, true))
        showDeckyToast({ title: 'Controller settings', body: "Couldn't save controller settings. Try again.", severity: 'error' })
        return false
      } finally {
        edit.baseline.pending -= 1
        if (edit.baseline.pending === 0 && saveBaselines.get(edit.appId) === edit.baseline) {
          saveBaselines.delete(edit.appId)
        }
        inFlight.current -= 1
        if (mounted.current) setSaving(inFlight.current > 0)
      }
    })
  }

  const flushPendingIntensity = (): Promise<boolean> => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
    const edit = pendingIntensity.current
    pendingIntensity.current = null
    if (mounted.current) setHasPendingIntensity(false)
    return edit ? saveEdit(edit) : Promise.resolve(true)
  }
  const flushRef = useRef(flushPendingIntensity)
  flushRef.current = flushPendingIntensity

  useEffect(() => {
    mounted.current = true
    const flushTarget = (target: string) => pendingIntensity.current?.appId === target
      ? flushRef.current()
      : Promise.resolve(true)
    pendingFlushers.add(flushTarget)
    return () => {
      mounted.current = false
      void flushRef.current()
      pendingFlushers.delete(flushTarget)
      refs.current.onBusyChange?.(false)
    }
  }, [])

  useEffect(() => {
    if (pendingIntensity.current && pendingIntensity.current.appId !== rumbleAppId) {
      void flushRef.current()
    }
  }, [rumbleAppId])

  useEffect(() => {
    refs.current.onBusyChange?.(saving || testingRumble || hasPendingIntensity)
  }, [saving, testingRumble, hasPendingIntensity])

  const canEdit = () => !refs.current.disabled && inFlight.current === 0 && !testing.current
  const change = (target: string, patch: GameControllerSettingsPatch) => {
    if (!canEdit()) return
    void flushPendingIntensity()
    void saveEdit(createEdit(target, patch))
  }

  const changeIntensity = (value: number) => {
    if (!canEdit()) return
    if (timer.current !== null) clearTimeout(timer.current)
    const previous = pendingIntensity.current?.appId === rumbleAppId ? pendingIntensity.current : undefined
    if (pendingIntensity.current && !previous) void flushPendingIntensity()
    pendingIntensity.current = createEdit(rumbleAppId, { rumbleIntensity: value }, previous)
    setHasPendingIntensity(true)
    timer.current = setTimeout(() => { void flushRef.current() }, 500)
  }

  const preview = async () => {
    if (!canEdit()) return
    const target = rumbleAppId
    testing.current = true
    setTestingRumble(true)
    try {
      if (!(await flushPendingIntensity())) return
      const success = await enqueue(() => testRumble(target))
      if (!success) throw new Error('Rumble preview failed')
    } catch {
      showDeckyToast({ title: 'Controller settings', body: "Couldn't send vibration test.", severity: 'error' })
    } finally {
      testing.current = false
      if (mounted.current) setTestingRumble(false)
    }
  }

  return {
    saving,
    busy: saving || testingRumble || hasPendingIntensity,
    controlsDisabled: disabled || saving || testingRumble,
    isPerGameSettingsEnabled: gameSettings?.enabled ?? false,
    isButtonPromptFixEnabled: gameSettings?.buttonPromptFixEnabled ?? false,
    rumbleAppId,
    rumbleEnabled: rumbleSettings.rumbleEnabled,
    rumbleIntensity: rumbleSettings.rumbleIntensity,
    testingRumble,
    setPerGameEnabled: (enabled: boolean) => { if (appId !== '0') change(appId, { enabled }) },
    setButtonPromptFixEnabled: (enabled: boolean) => { if (appId !== '0') change(appId, { buttonPromptFixEnabled: enabled }) },
    setRumbleEnabled: (enabled: boolean) => change(rumbleAppId, { rumbleEnabled: enabled }),
    setRumbleIntensity: changeIntensity,
    testRumble: () => { void preview() },
  }
}
