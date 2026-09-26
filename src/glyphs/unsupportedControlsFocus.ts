import { afterPatch, getGamepadNavigationTrees, type Patch } from "@decky/ui"

type Focusable = "none" | "self" | "children"

type NavigationNode = {
  Element?: HTMLElement
  GetFocusable: () => Focusable
}

type NavigationTree = {
  Root?: NavigationNode
}

const patches = new Map<object, Patch>()

export function syncUnsupportedControlsFocus(enabled: boolean) {
  if (!enabled) {
    for (const patch of patches.values()) {
      patch.unpatch()
    }
    patches.clear()
    return
  }

  const trees = (getGamepadNavigationTrees() ?? []) as NavigationTree[]
  for (const tree of trees) {
    if (!tree.Root) {
      continue
    }

    const prototype = Object.getPrototypeOf(tree.Root) as NavigationNode | null
    if (!prototype || typeof prototype.GetFocusable !== "function" || patches.has(prototype)) {
      continue
    }

    // Steam's focus tree does not check display:none. Filter at GetFocusable
    // so linear, grid and direct focus searches all skip the hidden subtree.
    patches.set(prototype, afterPatch(prototype, "GetFocusable", function (
      this: NavigationNode,
      _args: unknown[],
      focusable: Focusable,
    ): Focusable {
      const element = this.Element
      const view = element?.ownerDocument.defaultView
      if (focusable !== "none" && element && view) {
        // This CSS property inherits, covering children of hidden controls too.
        // Only the rules owned by DeckyZone set it, and removing the stylesheet
        // restores navigation without changing Steam's node properties.
        const hidden = view.getComputedStyle(element)
          .getPropertyValue("--deckyzone-unsupported-control").trim()
        if (hidden === "1") {
          return "none"
        }
      }
      return focusable
    }))
  }
}
