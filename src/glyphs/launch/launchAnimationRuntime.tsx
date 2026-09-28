import { beforePatch, findModule, type Patch } from "@decky/ui"
import { createElement, useSyncExternalStore, type ComponentType } from "react"
import { ZotacZone, type ZotacZoneAnimationName, type ZotacZoneProps } from "./ZotacZone"

type LaunchProps = Omit<ZotacZoneProps, "animationName"> & { animationName?: string }
type ElementFactory = (...args: unknown[]) => unknown
type JsxRuntime = { jsx: ElementFactory; jsxs: ElementFactory }

let enabled = false
let patches: Patch[] = []
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

function isAnimationName(name: string): name is ZotacZoneAnimationName {
  return name === "None" || name === "ThumbstickMoveAnimation" ||
    name === "MouseMoveTriggerClick" || name === "TouchscreenAnimation"
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
    if (args[0] !== NativeArtwork) {
      return
    }
    const props = args[1] as LaunchProps | undefined
    if (typeof props?.className === "string" &&
        props.className.split(/\s+/).includes(classes!.LegionGoSvg)) {
      args[0] = LaunchArtwork
    }
  }

  // Steam creates these elements through jsx/jsxs rather than createElement.
  // Deck-Shelves' installCaptureHooks uses the same factory interception;
  // Decky's patcher also preserves other plugins' patches during cleanup.
  try {
    patches.push(beforePatch(jsx, "jsx", replaceLaunchArtwork))
    patches.push(beforePatch(jsx, "jsxs", replaceLaunchArtwork))
  } catch (error) {
    for (const patch of patches.reverse()) {
      patch.unpatch()
    }
    patches = []
    console.warn("DeckyZone: couldn't attach launch artwork", error)
  }
}

export function syncLaunchAnimationRuntime(nextEnabled: boolean) {
  const changed = enabled !== nextEnabled
  enabled = nextEnabled
  if (enabled && patches.length === 0) {
    installLaunchAnimationPatch()
  } else if (!enabled) {
    for (const patch of patches.reverse()) {
      patch.unpatch()
    }
    patches = []
  }
  if (changed) {
    for (const listener of listeners) {
      listener()
    }
  }
}
