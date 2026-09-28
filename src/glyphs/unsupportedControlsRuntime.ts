import { afterPatch, getGamepadNavigationTrees, getReactInstance, type Patch } from "@decky/ui"

type Focusable = "none" | "self" | "children"

type NavigationNode = {
  Element?: HTMLElement
  GetFocusable: () => Focusable
}

type NavigationTree = {
  Root?: NavigationNode
}

const patches = new Map<object, Patch>()
const documents = new Map<Document, () => void>()
const QUICK_SETTINGS_ROW = "._3KXWx6W4d1AK_pVdSlbpj6 > .eKmEXJCm_lgme24Fp_HWt"
const TRACKPAD_ATTRIBUTE = "data-deckyzone-unsupported-trackpad"

type ControllerFiber = {
  memoizedProps?: { eControllerSource?: number; baseActionSet?: unknown }
  stateNode?: unknown
  return?: ControllerFiber
}

function isRightTrackpadRow(row: Element) {
  // The Quick Settings dropdown has no trackpad glyph or unique DOM class.
  // Steam identifies it with eControllerSource=2 and baseActionSet. Use that
  // component's props so this also works with translated labels.
  let fiber = getReactInstance(row) as ControllerFiber | undefined
  while (fiber && fiber.stateNode !== row.parentElement) {
    if (fiber.memoizedProps?.baseActionSet && fiber.memoizedProps.eControllerSource === 2) {
      return true
    }
    fiber = fiber.return
  }
  return false
}

function watchTrackpadRows(document: Document) {
  if (documents.has(document)) {
    return
  }

  const marked = new Set<Element>()
  const reconcile = () => {
    for (const row of marked) {
      if (!row.isConnected || !row.matches(QUICK_SETTINGS_ROW) || !isRightTrackpadRow(row)) {
        row.removeAttribute(TRACKPAD_ATTRIBUTE)
        marked.delete(row)
      }
    }
    for (const row of document.querySelectorAll(QUICK_SETTINGS_ROW)) {
      if (isRightTrackpadRow(row)) {
        row.setAttribute(TRACKPAD_ATTRIBUTE, "true")
        marked.add(row)
      }
    }
  }
  const observer = new MutationObserver(reconcile)
  observer.observe(document, { childList: true, subtree: true })
  reconcile()
  documents.set(document, () => {
    observer.disconnect()
    for (const row of marked) {
      row.removeAttribute(TRACKPAD_ATTRIBUTE)
    }
  })
}

export function syncUnsupportedControlsRuntime(enabled: boolean) {
  if (!enabled) {
    for (const cleanup of documents.values()) {
      cleanup()
    }
    documents.clear()
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

    const document = tree.Root.Element?.ownerDocument
    if (document) {
      watchTrackpadRows(document)
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
