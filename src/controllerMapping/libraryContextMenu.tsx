import {
  afterPatch,
  EUIMode,
  fakeRenderComponent,
  findInReactTree,
  findInTree,
  findModuleChild,
  MenuItem,
  removeHookStubs,
  type Patch,
} from '@decky/ui'
import { useSyncExternalStore } from 'react'
import { openControllerMapping } from '../routes'
import type { DeckyZoneState } from '../state/DeckyZoneState'

// Based on HLTB for Deck's LibraryContextMenu, including c56263a and c192ddd.
// HLTB credits SteamGridDB for the original context-menu patch.
const MENU_KEY = 'deckyzone-controller-mappings'

function getFunctionSource(value: unknown): string {
  if (typeof value !== 'function') return ''
  try {
    const source = value.toString()
    if (typeof source === 'string') return source
  } catch { /* Fall back for patched exports. */ }
  try {
    return Function.prototype.toString.call(value)
  } catch {
    return ''
  }
}

function validAppId(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

const getOverviewAppId = (component: any) => validAppId(component?._owner?.pendingProps?.overview?.appid)
const getTreeAppId = (tree: any): number | null => {
  const data = findInTree(tree, (item) => validAppId(item?.app?.appid) !== null, {
    walkable: ['props', 'children'],
  })
  return validAppId(data?.app?.appid)
}

function resolveUpdatedAppId(children: any[], currentAppId: number | null): number | null {
  if (!Array.isArray(children)) return null
  const parent = children.find((item) => {
    const id = getOverviewAppId(item) ?? getTreeAppId(item)
    return id !== null && id !== currentAppId
  })
  return parent
    ? getOverviewAppId(parent) ?? getTreeAppId(parent)
    : getTreeAppId(children) ?? currentAppId
}

function findLibraryContextMenu() {
  const component = findModuleChild((module) => {
    if (!module || typeof module !== 'object') return undefined
    try {
      const exports = Object.values(module)
      if (exports.some((value) => getFunctionSource(value).includes('().LibraryContextMenu'))) {
        return exports.find((value) => getFunctionSource(value).includes('navigator:'))
      }
    } catch { /* Ignore exports that cannot be inspected. */ }
    return undefined
  })
  if (typeof component !== 'function') return null
  try {
    const menu = fakeRenderComponent(component)?.type
    return typeof menu?.prototype?.render === 'function' ? menu : null
  } finally {
    removeHookStubs()
  }
}

export function registerControllerMappingMenu(store: DeckyZoneState): () => void {
  let active = false
  let stopped = false
  let renderPatch: Patch | undefined
  let updatePatch: Patch | undefined
  let currentAppId: number | null = null
  let warned = false
  const listeners = new Set<() => void>()
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }
  const isActive = () => active
  const warn = (error: unknown) => {
    if (warned) return
    warned = true
    console.warn('DeckyZone: custom mapping context menu unavailable', error)
  }

  function MappingMenuItem({ appId }: { appId: number }) {
    const enabled = useSyncExternalStore(subscribe, isActive)
    const { bootstrap } = useSyncExternalStore(store.subscribe, store.getSnapshot)
    if (!enabled || bootstrap.state !== 'ready' || !bootstrap.snapshot.settings.inputplumberAvailable) return null
    const hasMapping = bootstrap.snapshot.settings.perGameSettings[String(appId)]?.controllerMapping != null
    return (
      <MenuItem onSelected={() => { if (active) openControllerMapping(String(appId)) }}>
        <span data-deckyzone-context-mappings={appId}>
          {hasMapping ? 'Edit ZONE mappings' : 'Add ZONE mappings'}
        </span>
      </MenuItem>
    )
  }

  const removeEntry = (children: any[]) => {
    if (!Array.isArray(children)) return
    for (let index = children.length - 1; index >= 0; index--) {
      if (children[index]?.key === MENU_KEY) children.splice(index, 1)
    }
  }
  const addEntry = (children: any[], appId: number) => {
    if (!active || !Array.isArray(children)) return
    removeEntry(children)
    const index = children.findIndex((item) => findInReactTree(item, (node) =>
      getFunctionSource(node?.onSelected).includes('AppProperties'),
    ))
    if (index !== -1) children.splice(index, 0, <MappingMenuItem key={MENU_KEY} appId={appId} />)
  }
  const unpatch = () => {
    updatePatch?.unpatch()
    renderPatch?.unpatch()
    updatePatch = undefined
    renderPatch = undefined
    currentAppId = null
  }
  const onModeChanged = (mode: EUIMode) => {
    if (stopped) return
    active = mode === EUIMode.GamePad
    if (!active) {
      unpatch()
    } else if (!renderPatch) {
      try {
        const menu = findLibraryContextMenu()
        if (menu) {
          renderPatch = afterPatch(menu.prototype, 'render', (_, component: any) => {
            if (!active) return component
            try {
              const appId = getOverviewAppId(component) ?? getTreeAppId(component?.props?.children)
              currentAppId = appId
              if (appId === null) return component
              if (!updatePatch && typeof component?.type?.prototype?.shouldComponentUpdate === 'function') {
                updatePatch = afterPatch(component.type.prototype, 'shouldComponentUpdate', ([nextProps], shouldUpdate) => {
                  if (!active) return shouldUpdate
                  try {
                    removeEntry(nextProps?.children)
                    if (shouldUpdate === true) {
                      currentAppId = resolveUpdatedAppId(nextProps?.children, currentAppId)
                      if (currentAppId !== null) addEntry(nextProps?.children, currentAppId)
                    }
                  } catch (error) { warn(error) }
                  return shouldUpdate
                })
              }
              addEntry(component?.props?.children, appId)
            } catch (error) { warn(error) }
            return component
          })
        } else {
          warn('Steam library menu was not found')
        }
      } catch (error) {
        unpatch()
        warn(error)
      }
    }
    listeners.forEach((listener) => listener())
  }

  let registration: { unregister(): void } | undefined
  try {
    // Steam delivers the current mode on registration, then subsequent changes.
    registration = window.SteamClient?.UI?.RegisterForUIModeChanged(onModeChanged)
  } catch (error) { warn(error) }
  return () => {
    stopped = true
    active = false
    registration?.unregister()
    unpatch()
    listeners.forEach((listener) => listener())
    listeners.clear()
  }
}
