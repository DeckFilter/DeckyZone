import { beforePatch, DialogButton, Field, findModule, type Patch } from '@decky/ui'
import { Children, cloneElement, createElement, isValidElement, useSyncExternalStore, type ComponentType, type ReactNode } from 'react'
import { openControllerMapping } from '../routes'

type GroupProps = { appid: number; sourceId: string; modeShift?: boolean; children: ReactNode }
type ChildProps = { children?: ReactNode; input?: { key?: number } }
type Factory = (...args: unknown[]) => unknown
let enabled = false
let patches: Patch[] = []
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function syncSteamMappingEntry(active: boolean) {
  enabled = active
  if (!active) {
    patches.splice(0).reverse().forEach(p => p.unpatch())
  } else if (!patches.length) {
    const jsx = findModule(m => typeof m?.jsx === 'function' && typeof m?.jsxs === 'function') as { jsx: Factory; jsxs: Factory } | undefined
    if (jsx) {
      const wrappers = new WeakMap<ComponentType<GroupProps>, ComponentType<GroupProps>>()
      const patch = (args: unknown[]) => {
        const props = args[1] as GroupProps | undefined
        if (props?.sourceId !== '#ControllerConfigurator_Source_Switches' || props.modeShift || typeof args[0] !== 'function') return
        const Native = args[0] as ComponentType<GroupProps>
        if (!Native.toString().includes('#ControllerConfigurator_SourceMode_Group_BehaviorField')) return
        let Wrapped = wrappers.get(Native)
        if (!Wrapped) {
          Wrapped = function MappingGroup(group: GroupProps) {
            const visible = useSyncExternalStore(subscribe, () => enabled)
            if (!visible || !Number.isInteger(group.appid) || group.appid <= 0) return createElement(Native, group)
            const row = <Field key="deckyzone-mappings" label="Dials and trackpads" childrenContainerWidth="fixed" inlineWrap="keep-inline">
              <DialogButton data-deckyzone-steam-mappings={group.appid} onClick={() => openControllerMapping(String(group.appid))}>Custom mappings</DialogButton>
            </Field>
            let inserted = false
            const insert = (children: ReactNode): ReactNode => Children.map(children, child => {
              if (!isValidElement<ChildProps>(child)) return child
              // Steam's switches group ends its extended buttons with input 56 (R5).
              if (!inserted && child.props.input?.key === 56) { inserted = true; return [child, row] }
              return child.props.children === undefined ? child : cloneElement(child, {}, insert(child.props.children))
            })
            const children = insert(group.children)
            return createElement(Native, { ...group, children: inserted ? children : <>{children}{row}</> })
          }
          wrappers.set(Native, Wrapped)
        }
        args[0] = Wrapped
      }
      patches.push(beforePatch(jsx, 'jsx', patch), beforePatch(jsx, 'jsxs', patch))
    }
  }
  listeners.forEach(listener => listener())
}
