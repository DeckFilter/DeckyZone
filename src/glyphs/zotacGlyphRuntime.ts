import { executeInTab, fetchNoCors, injectCssIntoTab, removeCssFromTab } from "@decky/api"
import {
  ZOTAC_GLYPH_CSS,
  ZOTAC_UNSUPPORTED_BUTTONS_CSS,
} from "./generated/zotacGlyphCss"
import { syncUnsupportedControlsRuntime } from "./unsupportedControlsRuntime"

const RECONCILE_INTERVAL_MS = 3000
const TAB_OPERATION_TIMEOUT_MS = 1500
const TAB_DISCOVERY_URL = "http://localhost:8080/json"

type InspectableTab = {
  title?: string
  url?: string
}

type CssFeatureOptions = {
  activeMarker: string
  css: string
  label: string
  syncRuntime?: (enabled: boolean) => void
}

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

async function resolveZotacUiTargetTabs() {
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

function createCssFeatureRuntime({ activeMarker, css, label, syncRuntime }: CssFeatureOptions) {
  const activeCheckCode = `(() => window.getComputedStyle(document.documentElement).getPropertyValue('${activeMarker}').trim())()`
  const injectedCssIdsByTab = new Map<string, string>()
  let desiredEnabled = false
  let generation = 0
  let reconcileTimer: ReturnType<typeof setInterval> | null = null
  let reconcileQueue = Promise.resolve()
  let backgroundReconcilePending = false

  async function isCssActiveInTab(tabName: string) {
    try {
      const result = await withTabOperationTimeout(
        executeInTab(tabName, false, activeCheckCode),
        tabName,
        `${label} activity check`,
      )
      return result.success && result.result === "1"
    } catch {
      return false
    }
  }

  async function removeInjectedCssForTab(tabName: string) {
    const cssId = injectedCssIdsByTab.get(tabName)
    if (!cssId) {
      return
    }

    try {
      await withTabOperationTimeout(removeCssFromTab(tabName, cssId), tabName, `${label} CSS removal`)
    } catch {
      // Ignore missing tabs or stale css ids during cleanup/reconcile.
    }

    injectedCssIdsByTab.delete(tabName)
  }

  async function removeInjectedCssFromAllTabs() {
    const tabs = Array.from(injectedCssIdsByTab.keys())
    for (const tabName of tabs) {
      await removeInjectedCssForTab(tabName)
    }
  }

  async function ensureCssForTab(tabName: string, requestedGeneration: number) {
    if (!desiredEnabled || generation !== requestedGeneration) {
      return false
    }

    if (await isCssActiveInTab(tabName)) {
      return true
    }

    await removeInjectedCssForTab(tabName)
    if (!desiredEnabled || generation !== requestedGeneration) {
      return false
    }

    try {
      const cssId = await withTabOperationTimeout(
        injectCssIntoTab(tabName, css),
        tabName,
        `${label} CSS injection`,
      )

      if (!desiredEnabled || generation !== requestedGeneration) {
        try {
          await withTabOperationTimeout(
            removeCssFromTab(tabName, cssId),
            tabName,
            `${label} stale CSS removal`,
          )
        } catch {
          // Ignore tabs that disappeared while the setting changed.
        }
        return false
      }

      injectedCssIdsByTab.set(tabName, cssId)
      return true
    } catch {
      return false
    }
  }

  async function reconcileCss(requireAtLeastOneApplied = false) {
    if (!desiredEnabled) {
      return
    }

    // Retry if Steam's navigation trees were not ready when the setting loaded.
    syncRuntime?.(true)

    const requestedGeneration = generation
    const targetTabs = await resolveZotacUiTargetTabs()
    let appliedToAtLeastOneTab = false

    for (const tabName of targetTabs) {
      if (await ensureCssForTab(tabName, requestedGeneration)) {
        appliedToAtLeastOneTab = true
      }
    }

    if (
      requireAtLeastOneApplied &&
      desiredEnabled &&
      generation === requestedGeneration &&
      !appliedToAtLeastOneTab
    ) {
      throw new Error(`No supported Steam UI tabs were available for ${label} CSS injection`)
    }
  }

  function runReconcile(requireAtLeastOneApplied = false) {
    const operation = reconcileQueue.then(() => reconcileCss(requireAtLeastOneApplied))
    reconcileQueue = operation.catch(() => undefined)
    return operation
  }

  async function removeCssAfterPendingReconcile() {
    await reconcileQueue
    await removeInjectedCssFromAllTabs()
  }

  function requestBackgroundReconcile() {
    if (backgroundReconcilePending) {
      return
    }

    backgroundReconcilePending = true
    void runReconcile(false).finally(() => {
      backgroundReconcilePending = false
    })
  }

  function startReconcileTimer() {
    if (reconcileTimer !== null) {
      return
    }

    reconcileTimer = setInterval(() => {
      requestBackgroundReconcile()
    }, RECONCILE_INTERVAL_MS)
  }

  function stopReconcileTimer() {
    if (reconcileTimer === null) {
      return
    }

    clearInterval(reconcileTimer)
    reconcileTimer = null
  }

  function setDesiredEnabled(enabled: boolean) {
    if (desiredEnabled !== enabled) {
      generation += 1
    }
    desiredEnabled = enabled
    syncRuntime?.(enabled)
  }

  function syncStoredEnabled(enabled: boolean) {
    setDesiredEnabled(enabled)

    if (enabled) {
      startReconcileTimer()
      requestBackgroundReconcile()
      return
    }

    stopReconcileTimer()
    void removeCssAfterPendingReconcile()
  }

  async function applyEnabled(enabled: boolean) {
    setDesiredEnabled(enabled)

    if (enabled) {
      startReconcileTimer()
      await runReconcile(true)
      return
    }

    stopReconcileTimer()
    await removeCssAfterPendingReconcile()
  }

  async function cleanup() {
    setDesiredEnabled(false)
    stopReconcileTimer()
    await removeCssAfterPendingReconcile()
  }

  return { applyEnabled, cleanup, syncStoredEnabled }
}

const zotacGlyphsRuntime = createCssFeatureRuntime({
  activeMarker: "--deckyzone-zotac-glyphs-active",
  css: ZOTAC_GLYPH_CSS,
  label: "Zotac controller artwork",
})

const unsupportedButtonsRuntime = createCssFeatureRuntime({
  activeMarker: "--deckyzone-hide-unsupported-buttons-active",
  css: ZOTAC_UNSUPPORTED_BUTTONS_CSS,
  label: "unsupported button hiding",
  syncRuntime: syncUnsupportedControlsRuntime,
})

export function syncStoredZotacGlyphsRuntimeEnabled(enabled: boolean) {
  zotacGlyphsRuntime.syncStoredEnabled(enabled)
}

export function syncStoredHideUnsupportedButtonsRuntimeEnabled(enabled: boolean) {
  unsupportedButtonsRuntime.syncStoredEnabled(enabled)
}

export async function applyZotacGlyphsRuntimeEnabled(enabled: boolean) {
  await zotacGlyphsRuntime.applyEnabled(enabled)
}

export async function applyHideUnsupportedButtonsRuntimeEnabled(enabled: boolean) {
  await unsupportedButtonsRuntime.applyEnabled(enabled)
}

export async function cleanupZotacUiRuntime() {
  await Promise.all([
    zotacGlyphsRuntime.cleanup(),
    unsupportedButtonsRuntime.cleanup(),
  ])
}
