import { beforePatch, findModule, type Patch } from "@decky/ui"
import { createElement, useSyncExternalStore, type ComponentType } from "react"
import { ZotacZone, type ZotacZoneAnimationName, type ZotacZoneProps } from "./ZotacZone"

type LaunchProps = Omit<ZotacZoneProps, "animationName"> & { animationName?: string }
type ElementFactory = (...args: unknown[]) => unknown
type JsxRuntime = { jsx: ElementFactory; jsxs: ElementFactory }
type PatchedFactory = ElementFactory & { __deckyPatch?: Patch }

let enabled = false
let runtime: { reconcile: () => void; cleanup: () => void } | undefined
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function isAnimationName(name: string): name is ZotacZoneAnimationName {
  return name === "None" || name === "ThumbstickMoveAnimation" ||
    name === "MouseMoveTriggerClick" || name === "TouchscreenAnimation"
}

function isPatchAttached(patch: Patch) {
  const visited = new Set<ElementFactory>()
  let current = patch.object[patch.property] as PatchedFactory | undefined
  while (typeof current === "function" && !visited.has(current)) {
    if (current === patch.patchedFunction) return true
    visited.add(current)
    current = current.__deckyPatch?.original as PatchedFactory | undefined
  }
  return false
}

function installLaunchAnimationPatch() {
  // Resolve semantic exports through Decky's module cache; Steam chunk names
  // and hashed class names change between client builds.
  const icons = findModule((module) => typeof module?.LegionGoS === "function") as
    { LegionGoS: ComponentType<LaunchProps> } | undefined
  const classes = findModule((module) =>
    typeof module?.LegionGoSvg === "string" &&
    typeof module?.ControllerInterstitialAnimationContainer === "string",
  ) as { LegionGoSvg: string } | undefined
  const jsx = findModule((module) =>
    typeof module?.jsx === "function" && typeof module?.jsxs === "function",
  ) as JsxRuntime | undefined
  if (!icons || !classes || !jsx) {
    return
  }

  const NativeArtwork = icons.LegionGoS
  function LaunchArtwork(props: LaunchProps) {
    // A launch screen may still be mounted when the setting is disabled or
    // the plugin unloads. Restore its native artwork immediately as well.
    const active = useSyncExternalStore(subscribe, () => enabled)
    const { animationName = "None", ...svgProps } = props
    if (!active || !isAnimationName(animationName)) {
      return createElement(NativeArtwork, props)
    }
    return <ZotacZone {...svgProps} animationName={animationName}
      data-deckyzone-launch-animation={animationName} />
  }

  function replaceLaunchArtwork(args: unknown[]) {
    // The same native drawing is used by controller editors. Only replace the
    // element carrying Steam's launch-illustration class, before React mounts it.
    if (!enabled || args[0] !== NativeArtwork) {
      return
    }
    const props = args[1] as LaunchProps | undefined
    if (typeof props?.className === "string" &&
        props.className.split(/\s+/).includes(classes!.LegionGoSvg)) {
      args[0] = LaunchArtwork
    }
  }

  const patches = new Map<keyof JsxRuntime, Patch>()
  const restoreProperties: (() => void)[] = []
  let stopped = false
  let reconciling = false
  let reconcileQueued = false

  function reconcile() {
    if (stopped || !enabled || reconciling) return
    reconciling = true
    try {
      for (const key of ["jsx", "jsxs"] as const) {
        const patch = patches.get(key)
        if (patch && isPatchAttached(patch)) continue
        patches.set(key, beforePatch(jsx, key, replaceLaunchArtwork))
      }
    } finally {
      reconciling = false
    }
  }

  function cleanup() {
    stopped = true
    for (const patch of patches.values()) {
      // Decky's patcher cannot unpatch a function another owner has replaced.
      if (isPatchAttached(patch)) patch.unpatch()
    }
    patches.clear()
    for (const restore of restoreProperties) restore()
  }

  // Decky's React 19 toast renderer temporarily replaces these factories, then
  // restores versions captured before plugins loaded. Wait until its synchronous
  // render finishes before repairing our hooks; never intercept its hook stubs.
  try {
    for (const key of ["jsx", "jsxs"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(jsx, key)
      if (!descriptor?.configurable || !descriptor.writable || !("value" in descriptor)) continue
      let current = jsx[key]
      const get = () => current
      Object.defineProperty(jsx, key, {
        configurable: true,
        enumerable: descriptor.enumerable,
        get,
        set(value: ElementFactory) {
          current = value
          if (stopped || reconciling || reconcileQueued) return
          reconcileQueued = true
          queueMicrotask(() => {
            reconcileQueued = false
            try {
              reconcile()
            } catch (error) {
              console.warn("DeckyZone: couldn't restore launch artwork", error)
            }
          })
        },
      })
      restoreProperties.push(() => {
        if (Object.getOwnPropertyDescriptor(jsx, key)?.get === get) {
          Object.defineProperty(jsx, key, { ...descriptor, value: current })
        }
      })
    }
    reconcile()
    runtime = { reconcile, cleanup }
  } catch (error) {
    cleanup()
    console.warn("DeckyZone: couldn't attach launch artwork", error)
  }
}

export function syncLaunchAnimationRuntime(nextEnabled: boolean) {
  const changed = enabled !== nextEnabled
  enabled = nextEnabled
  if (enabled) {
    if (runtime) runtime.reconcile()
    else installLaunchAnimationPatch()
  } else {
    runtime?.cleanup()
    runtime = undefined
  }
  if (changed) {
    for (const listener of listeners) {
      listener()
    }
  }
}
