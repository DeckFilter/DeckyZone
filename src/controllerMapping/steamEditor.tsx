import { beforePatch, DialogButton, Field, findModule, useParams, type Patch } from '@decky/ui'
import { useSyncExternalStore, type ReactNode } from 'react'
import { openControllerMapping } from '../routes'
import type { PluginSettings } from '../types/plugin'

type QuickSettingsProps = { className?: string; children?: ReactNode }
type Factory = (...args: unknown[]) => unknown
let currentSettings: PluginSettings | null = null
let patches: Patch[] = []
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

function SteamMappingEntry() {
  const settings = useSyncExternalStore(subscribe, () => currentSettings)
  const { appid } = useParams<{ appid?: string }>()
  const appId = Number(appid)
  if (!settings?.inputplumberAvailable || !Number.isInteger(appId) || appId <= 0) return null
  const hasMapping = settings.perGameSettings[String(appId)]?.controllerMapping != null

  return (
    <Field label="Dials and trackpads" childrenContainerWidth="fixed" inlineWrap="keep-inline">
      <DialogButton data-deckyzone-steam-mappings={appId} onClick={() => openControllerMapping(String(appId))}>
        {hasMapping ? 'Edit custom mappings' : 'Add custom mappings'}
      </DialogButton>
    </Field>
  )
}

export function syncSteamMappingEntry(settings: PluginSettings | null) {
  currentSettings = settings
  const active = Boolean(settings?.inputplumberAvailable)
  if (!active) {
    patches.splice(0).reverse().forEach(p => p.unpatch())
  } else if (!patches.length) {
    const jsx = findModule(m => typeof m?.jsx === 'function' && typeof m?.jsxs === 'function') as { jsx: Factory; jsxs: Factory } | undefined
    const quickSettingsClasses = findModule(m => typeof m?.QuickSettingsFieldsContainer === 'string' && typeof m?.QuickSettingsHeader === 'string') as { QuickSettingsFieldsContainer: string } | undefined
    if (jsx && quickSettingsClasses) {
      const patch = (args: unknown[]) => {
        const props = args[1] as QuickSettingsProps | undefined
        if (args[0] !== 'div' || props?.className !== quickSettingsClasses.QuickSettingsFieldsContainer) return
        args[1] = { ...props, children: [<SteamMappingEntry key="deckyzone-mappings" />, props.children] }
      }
      patches.push(beforePatch(jsx, 'jsx', patch), beforePatch(jsx, 'jsxs', patch))
    }
  }
  listeners.forEach(listener => listener())
}
