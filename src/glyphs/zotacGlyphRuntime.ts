import { executeInTab, fetchNoCors, injectCssIntoTab, removeCssFromTab } from "@decky/api"
import { ZOTAC_GLYPH_CSS } from "./generated/zotacGlyphCss"

const RECONCILE_INTERVAL_MS = 3000
const TAB_OPERATION_TIMEOUT_MS = 1500
const TAB_DISCOVERY_URL = "http://localhost:8080/json"
const ZOTAC_GLYPH_ACTIVE_CHECK_CODE = `(() => window.getComputedStyle(document.documentElement).getPropertyValue('--deckyzone-zotac-glyphs-active').trim())()`

type InspectableTab = {
  title?: string
  url?: string
}

let zotacGlyphsDesiredEnabled = false
let zotacGlyphsReconcileTimer: ReturnType<typeof setInterval> | null = null
let zotacGlyphsReconcileInFlight = false
const injectedCssIdsByTab = new Map<string, string[]>()

function withTabOperationTimeout<T>(value: PromiseLike<T> | T, tabName: string, action: string) {
  return Promise.race<T>([
    Promise.resolve(value),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${action} timed out for tab ${tabName}`))
      }, TAB_OPERATION_TIMEOUT_MS)
    }),
  ])
}

async function resolveZotacGlyphTargetTabs() {
  try {
    const response = await withTabOperationTimeout(fetchNoCors(TAB_DISCOVERY_URL), "cef-debugger", "tab discovery")
    if (!response.ok) {
      return []
    }

    const tabs = (await response.json()) as InspectableTab[]
    const titles = new Set<string>()

    for (const tab of tabs) {
      const title = tab.title?.trim()
      const url = tab.url ?? ""
      if (!title) {
        continue
      }

      if (
        title === "Steam Big Picture Mode" ||
        url.includes("Valve%20Steam%20Gamepad") ||
        url.includes("Valve Steam Gamepad/default")
      ) {
        titles.add(title)
        continue
      }

      if (title.startsWith("QuickAccess") || title.startsWith("MainMenu")) {
        titles.add(title)
      }
    }

    return Array.from(titles)
  } catch {
    return []
  }
}

async function isZotacGlyphCssActiveInTab(tabName: string) {
  try {
    const result = await withTabOperationTimeout(
      executeInTab(tabName, false, ZOTAC_GLYPH_ACTIVE_CHECK_CODE),
      tabName,
      "glyph activity check",
    )
    return result.success && result.result === "1"
  } catch {
    return false
  }
}

async function removeInjectedCssForTab(tabName: string) {
  const cssIds = injectedCssIdsByTab.get(tabName) ?? []
  if (!cssIds.length) {
    return
  }

  for (const cssId of cssIds) {
    try {
      await withTabOperationTimeout(removeCssFromTab(tabName, cssId), tabName, "glyph CSS removal")
    } catch {
      // Ignore missing tabs or stale css ids during cleanup/reconcile.
    }
  }

  injectedCssIdsByTab.delete(tabName)
}

async function removeInjectedCssFromAllTabs() {
  const tabs = Array.from(injectedCssIdsByTab.keys())
  for (const tabName of tabs) {
    await removeInjectedCssForTab(tabName)
  }
}

async function ensureZotacGlyphCssForTab(tabName: string) {
  if (await isZotacGlyphCssActiveInTab(tabName)) {
    return true
  }

  await removeInjectedCssForTab(tabName)

  try {
    const cssId = await withTabOperationTimeout(injectCssIntoTab(tabName, ZOTAC_GLYPH_CSS), tabName, "glyph CSS injection")
    injectedCssIdsByTab.set(tabName, [cssId])
    return true
  } catch {
    return false
  }
}

async function reconcileZotacGlyphCss(requireAtLeastOneApplied = false) {
  if (!zotacGlyphsDesiredEnabled) {
    return
  }

  const targetTabs = await resolveZotacGlyphTargetTabs()
  let appliedToAtLeastOneTab = false

  for (const tabName of targetTabs) {
    // Treat an already-active style the same as a fresh injection.
    if (await ensureZotacGlyphCssForTab(tabName)) {
      appliedToAtLeastOneTab = true
    }
  }

  if (requireAtLeastOneApplied && !appliedToAtLeastOneTab) {
    throw new Error("No supported Steam UI tabs were available for Zotac glyph injection")
  }
}

async function runZotacGlyphsReconcile(requireAtLeastOneApplied = false) {
  if (zotacGlyphsReconcileInFlight) {
    return
  }

  zotacGlyphsReconcileInFlight = true
  try {
    await reconcileZotacGlyphCss(requireAtLeastOneApplied)
  } finally {
    zotacGlyphsReconcileInFlight = false
  }
}

function startZotacGlyphsReconcileTimer() {
  if (zotacGlyphsReconcileTimer !== null) {
    return
  }

  zotacGlyphsReconcileTimer = setInterval(() => {
    void runZotacGlyphsReconcile(false)
  }, RECONCILE_INTERVAL_MS)
}

function stopZotacGlyphsReconcileTimer() {
  if (zotacGlyphsReconcileTimer === null) {
    return
  }

  clearInterval(zotacGlyphsReconcileTimer)
  zotacGlyphsReconcileTimer = null
}

export function syncStoredZotacGlyphsRuntimeEnabled(enabled: boolean) {
  zotacGlyphsDesiredEnabled = enabled

  if (enabled) {
    startZotacGlyphsReconcileTimer()
    void runZotacGlyphsReconcile(false)
    return
  }

  stopZotacGlyphsReconcileTimer()
  void removeInjectedCssFromAllTabs()
}

export async function applyZotacGlyphsRuntimeEnabled(enabled: boolean) {
  zotacGlyphsDesiredEnabled = enabled

  if (enabled) {
    startZotacGlyphsReconcileTimer()
    await reconcileZotacGlyphCss(true)
    return
  }

  stopZotacGlyphsReconcileTimer()
  await removeInjectedCssFromAllTabs()
}

export async function cleanupZotacGlyphsRuntime() {
  zotacGlyphsDesiredEnabled = false
  stopZotacGlyphsReconcileTimer()
  await removeInjectedCssFromAllTabs()
}
