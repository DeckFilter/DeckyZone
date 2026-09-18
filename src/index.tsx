import {
  ButtonItem,
  Navigation,
  PanelSection,
  PanelSectionRow,
  Router,
  SteamSpinner,
  Tabs,
} from '@decky/ui'
import { addEventListener, callable, definePlugin, removeEventListener, routerHook } from '@decky/api'
import { Fragment, type ReactNode, useEffect, useRef, useState } from 'react'
import { FaDesktop, FaEllipsisH, FaGamepad, FaSlidersH, FaTachometerAlt } from 'react-icons/fa'
import ControllerPanel from "./components/ControllerPanel"
import SystemInformationPage from "./pages/SystemInformationPage"
import DisplayPanel from "./components/DisplayPanel"
import ErrorBoundary from "./components/ErrorBoundary"
import InterfacePanel from "./components/InterfacePanel"
import LayoutPanel from './components/LayoutPanel'
import PerformancePanel from "./components/PerformancePanel"
import QuickAccessTitleView from "./components/QuickAccessTitleView"
import TroubleshootingPanel from "./components/TroubleshootingPanel"
import UpdatesPanel from "./components/UpdatesPanel"
import ZotacIcon from "./components/ZotacIcon"
import { cleanupZotacGlyphsRuntime, syncStoredZotacGlyphsRuntimeEnabled } from "./glyphs/zotacGlyphRuntime"
import { DECKYZONE_ROUTE } from './routes'
import type { ActiveGame, PluginResetResult, PluginSettings, PluginStatus } from "./types/plugin"
import { checkLatestVersion, compareVersions, resetStartupCheck } from './utils/pluginUpdates'
import { showDeckyToast } from './utils/toasts'

type BrightnessDialDirection = 'up' | 'down'
type ActiveGameChangedHandler = (newGame: ActiveGame | null, oldGame: ActiveGame | null) => void
type UnregisterFn = () => void
type BootstrapSnapshot = {
  status: PluginStatus
  settings: PluginSettings
}
type BootstrapState = { state: 'loading' } | { state: 'ready'; snapshot: BootstrapSnapshot } | { state: 'error'; message: string }
type PluginSettingsUpdate = PluginSettings | ((currentSettings: PluginSettings) => PluginSettings)

const getStatus = callable<[], PluginStatus>('get_status')
const getSettings = callable<[], PluginSettings>('get_settings')
const resetPlugin = callable<[], PluginResetResult>('reset_plugin')
const syncPerGameTarget = callable<[string], boolean>('sync_per_game_target')

const DEFAULT_APP_ID = '0'
const ACTIVE_GAME_POLL_INTERVAL_MS = 1000
const BOOTSTRAP_TIMEOUT_MS = 10_000
const BRIGHTNESS_DIAL_FIX_STEP = 5
const REMAINING_BATTERY_TIME_AUTO_DISABLED_EVENT = 'remaining_battery_time_fix_disabled'

let brightnessDialFixEnabled = false
let homeButtonEnabled = false
let currentBrightnessPercent = 50
let brightnessChangeRegistration: { unregister?: () => void } | null = null
let brightnessDialFixEventListener: ((direction: BrightnessDialDirection) => void) | null = null
let bootstrapState: BootstrapState = { state: 'loading' }
let bootstrapPromise: Promise<void> | null = null
let bootstrapGeneration = 0
let updateNoticeGeneration = 0
let notifiedUpdateVersion: string | null = null
let currentMainTab = 'controller'

const mainTabsStyle = {
  contain: 'layout style paint',
  height: '95%',
  marginTop: '-12px',
  maxWidth: '100%',
  position: 'absolute' as const,
  width: 'calc(100vw - 50px)',
}

const tabContentStyle = {
  marginLeft: '-2.8vw',
  marginRight: '-2.8vw',
}

const TabIcon = ({ label, children }: { label: string; children: ReactNode }) => (
  <span aria-label={label} title={label} style={{ display: 'block', lineHeight: 0 }}>
    {children}
  </span>
)

function clampBrightnessPercent(value: number) {
  return Math.min(100, Math.max(0, value))
}

function setBrightnessDialFixRuntimeEnabled(enabled: boolean) {
  brightnessDialFixEnabled = enabled
}

function setHomeButtonRuntimeEnabled(enabled: boolean) {
  homeButtonEnabled = enabled
}

function applyBrightnessDialDelta(delta: number) {
  if (!delta) {
    return
  }

  if (!window.SteamClient?.System?.Display?.SetBrightness) {
    return
  }

  const nextBrightness = clampBrightnessPercent(currentBrightnessPercent + delta)
  if (nextBrightness === currentBrightnessPercent) {
    return
  }

  currentBrightnessPercent = nextBrightness
  // Prefer SteamClient for the SteamOS path. If this ever proves insufficient,
  // a future fallback could use /sys/class/backlight or a gamescope-level path.
  window.SteamClient.System.Display.SetBrightness(nextBrightness / 100)
}

function registerBrightnessDialFixListeners() {
  if (!brightnessChangeRegistration && window.SteamClient?.System?.Display?.RegisterForBrightnessChanges) {
    brightnessChangeRegistration = window.SteamClient.System.Display.RegisterForBrightnessChanges((data: { flBrightness: number }) => {
      currentBrightnessPercent = clampBrightnessPercent(data.flBrightness * 100)
    })
  }

  if (!brightnessDialFixEventListener) {
    brightnessDialFixEventListener = (direction: BrightnessDialDirection) => {
      if (!brightnessDialFixEnabled) {
        return
      }

      applyBrightnessDialDelta(direction === 'up' ? BRIGHTNESS_DIAL_FIX_STEP : -BRIGHTNESS_DIAL_FIX_STEP)
    }

    addEventListener<[BrightnessDialDirection]>('brightness_dial_input', brightnessDialFixEventListener)
  }
}

function cleanupBrightnessDialFixListeners() {
  if (brightnessDialFixEventListener) {
    removeEventListener<[BrightnessDialDirection]>('brightness_dial_input', brightnessDialFixEventListener)
    brightnessDialFixEventListener = null
  }

  brightnessChangeRegistration?.unregister?.()
  brightnessChangeRegistration = null
}

function getBootstrapState() {
  return bootstrapState
}

function getBootstrapStatus() {
  return bootstrapState.state === 'ready' ? bootstrapState.snapshot.status : null
}

function getBootstrapSettings() {
  return bootstrapState.state === 'ready' ? bootstrapState.snapshot.settings : null
}

function setBootstrapSnapshot(nextStatus: PluginStatus, nextSettings: PluginSettings) {
  setBrightnessDialFixRuntimeEnabled(nextSettings.brightnessDialFixEnabled)
  setHomeButtonRuntimeEnabled(nextSettings.homeButtonEnabled)
  syncStoredZotacGlyphsRuntimeEnabled(nextSettings.zotacGlyphsEnabled)
  bootstrapState = {
    state: 'ready',
    snapshot: {
      status: nextStatus,
      settings: nextSettings,
    },
  }
}

function cacheBootstrapStatus(nextStatus: PluginStatus) {
  if (bootstrapState.state !== 'ready') {
    return
  }

  bootstrapState = {
    state: 'ready',
    snapshot: {
      ...bootstrapState.snapshot,
      status: nextStatus,
    },
  }
}

function cacheBootstrapSettings(nextSettings: PluginSettings) {
  setBrightnessDialFixRuntimeEnabled(nextSettings.brightnessDialFixEnabled)
  setHomeButtonRuntimeEnabled(nextSettings.homeButtonEnabled)
  syncStoredZotacGlyphsRuntimeEnabled(nextSettings.zotacGlyphsEnabled)

  if (bootstrapState.state !== 'ready') {
    return
  }

  bootstrapState = {
    state: 'ready',
    snapshot: {
      ...bootstrapState.snapshot,
      settings: nextSettings,
    },
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  })
}

function startBootstrap() {
  if (bootstrapPromise !== null) {
    return bootstrapPromise
  }

  const generation = ++bootstrapGeneration
  bootstrapState = { state: 'loading' }
  bootstrapPromise = withTimeout(
    Promise.all([getStatus(), getSettings()]),
    BOOTSTRAP_TIMEOUT_MS,
    'DeckyZone backend did not respond within 10 seconds.',
  )
    .then(([nextStatus, nextSettings]) => {
      if (generation !== bootstrapGeneration) {
        return
      }

      setBootstrapSnapshot(nextStatus, nextSettings)
    })
    .catch((error) => {
      if (generation !== bootstrapGeneration) {
        return
      }

      console.error('Failed to load DeckyZone state', error)
      bootstrapState = {
        state: 'error',
        message: `${error instanceof Error ? error.message : String(error)} Retry, or reload DeckyZone from Decky settings if this keeps happening.`,
      }
    })

  return bootstrapPromise
}

function retryBootstrap() {
  if (bootstrapState.state === 'loading' && bootstrapPromise !== null) {
    return bootstrapPromise
  }

  bootstrapGeneration += 1
  bootstrapPromise = null
  bootstrapState = { state: 'loading' }
  return startBootstrap()
}

function resetBootstrap() {
  bootstrapGeneration += 1
  bootstrapPromise = null
  bootstrapState = { state: 'loading' }
}

function startUpdateNoticeAfterBootstrap(bootstrap: Promise<void>, generation: number) {
  void bootstrap.then(async () => {
    if (generation !== updateNoticeGeneration || bootstrapState.state !== 'ready') {
      return
    }

    const installedVersionNum = bootstrapState.snapshot.settings.pluginVersionNum ?? ''
    try {
      const { latestVersionNum } = await checkLatestVersion(installedVersionNum)
      if (
        generation !== updateNoticeGeneration ||
        !/^v?\d+(?:\.\d+)*$/i.test(installedVersionNum) ||
        !/^v?\d+(?:\.\d+)*$/i.test(latestVersionNum) ||
        compareVersions(latestVersionNum, installedVersionNum) <= 0 ||
        notifiedUpdateVersion === latestVersionNum
      ) {
        return
      }

      notifiedUpdateVersion = latestVersionNum
      showDeckyToast({
        title: 'DeckyZone',
        body: 'Update available',
        severity: 'warning',
      })
    } catch {
      // A failed release check should not interrupt plugin startup.
    }
  })
}

function getActiveGame(): ActiveGame | null {
  const activeApp = Router.MainRunningApp as Partial<ActiveGame> | undefined
  const appId = `${activeApp?.appid ?? DEFAULT_APP_ID}`

  if (appId === DEFAULT_APP_ID) {
    return null
  }

  return {
    appid: appId,
    display_name: activeApp?.display_name || 'Current Game',
    icon_data: activeApp?.icon_data,
    icon_data_format: activeApp?.icon_data_format,
    icon_hash: activeApp?.icon_hash,
    local_cache_version: activeApp?.local_cache_version,
  }
}

class RunningApps {
  private static listeners: ActiveGameChangedHandler[] = []
  private static intervalId: ReturnType<typeof setInterval> | null = null
  private static lastActiveGame: ActiveGame | null = getActiveGame()
  private static lastAppId = RunningApps.lastActiveGame?.appid ?? DEFAULT_APP_ID

  private static pollActive() {
    const nextActiveGame = getActiveGame()
    const nextAppId = nextActiveGame?.appid ?? DEFAULT_APP_ID

    if (this.lastAppId !== nextAppId) {
      const previousActiveGame = this.lastActiveGame
      this.lastActiveGame = nextActiveGame
      this.lastAppId = nextAppId
      this.listeners.forEach((listener) => listener(nextActiveGame, previousActiveGame))
      return
    }

    this.lastActiveGame = nextActiveGame
  }

  static register() {
    this.lastActiveGame = getActiveGame()
    this.lastAppId = this.lastActiveGame?.appid ?? DEFAULT_APP_ID

    if (this.intervalId === null) {
      this.intervalId = setInterval(() => {
        this.pollActive()
      }, ACTIVE_GAME_POLL_INTERVAL_MS)
    }
  }

  static unregister() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.listeners = []
    this.lastActiveGame = null
    this.lastAppId = DEFAULT_APP_ID
  }

  static listenActiveChange(fn: ActiveGameChangedHandler): UnregisterFn {
    this.listeners.push(fn)
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== fn)
    }
  }

  static active() {
    return this.lastActiveGame?.appid ?? DEFAULT_APP_ID
  }

  static activeAppInfo() {
    return this.lastActiveGame
  }
}

function areGamesEqual(left: ActiveGame | null, right: ActiveGame | null) {
  if (!left && !right) {
    return true
  }

  if (!left || !right) {
    return false
  }

  return (
    left.appid === right.appid &&
    left.display_name === right.display_name &&
    left.icon_data === right.icon_data &&
    left.icon_data_format === right.icon_data_format &&
    left.icon_hash === right.icon_hash &&
    left.local_cache_version === right.local_cache_version
  )
}

async function syncActiveGameTarget(appId: string) {
  try {
    const synced = await syncPerGameTarget(appId)
    if (!synced) {
      return null
    }
    const nextStatus = await getStatus()
    cacheBootstrapStatus(nextStatus)
    return nextStatus
  } catch (error) {
    console.error('Failed to sync per-game target', error)
  }
  return null
}

function Content() {
  const [bootstrap, setBootstrap] = useState<BootstrapState>(getBootstrapState())
  const [status, setStatus] = useState<PluginStatus | null>(() => getBootstrapStatus())
  const [settings, setSettings] = useState<PluginSettings | null>(() => getBootstrapSettings())
  const isMountedRef = useRef(true)
  const settingsRef = useRef(settings)
  const settingsRevisionRef = useRef(0)
  settingsRef.current = settings
  const [activeGame, setActiveGame] = useState<ActiveGame | null>(getActiveGame())
  const [uiRevision, setUiRevision] = useState(0)
  const [activeTab, setActiveTab] = useState(currentMainTab)

  const syncBootstrapIntoLocalState = () => {
    if (!isMountedRef.current) {
      return
    }

    const nextBootstrap = getBootstrapState()
    setBootstrap(nextBootstrap)
    if (nextBootstrap.state !== 'ready') {
      return
    }

    setStatus(nextBootstrap.snapshot.status)
    settingsRef.current = nextBootstrap.snapshot.settings
    settingsRevisionRef.current += 1
    setSettings(nextBootstrap.snapshot.settings)
  }

  const applySettingsUpdate = (update: PluginSettingsUpdate) => {
    const currentSettings = settingsRef.current
    if (typeof update === 'function' && !currentSettings) {
      return
    }

    const nextSettings = typeof update === 'function' ? update(currentSettings!) : update
    settingsRef.current = nextSettings
    settingsRevisionRef.current += 1
    cacheBootstrapSettings(nextSettings)
    setBootstrap(getBootstrapState())
    setSettings(nextSettings)
  }

  const applyStatusUpdate = (nextStatus: PluginStatus) => {
    cacheBootstrapStatus(nextStatus)
    setBootstrap(getBootstrapState())
    setStatus(nextStatus)
  }

  const applySnapshotUpdate = (nextStatus: PluginStatus, nextSettings: PluginSettings) => {
    settingsRef.current = nextSettings
    settingsRevisionRef.current += 1
    setBootstrapSnapshot(nextStatus, nextSettings)
    setBootstrap(getBootstrapState())
    setStatus(nextStatus)
    setSettings(nextSettings)
  }

  const refreshStatusAfterActiveGameSync = (appId: string) => {
    if (!isMountedRef.current) {
      return
    }

    void syncActiveGameTarget(appId).then((nextStatus) => {
      if (isMountedRef.current && nextStatus) {
        applyStatusUpdate(nextStatus)
      }
    })
  }

  const handleResetPlugin = async () => {
    let glyphCleanupFailed = false

    try {
      await cleanupZotacGlyphsRuntime()
    } catch {
      glyphCleanupFailed = true
    }

    const result = await resetPlugin()
    let nextStatus = result.status
    let nextSettings = result.settings

    try {
      ;[nextStatus, nextSettings] = await Promise.all([getStatus(), getSettings()])
    } catch (error) {
      console.error('Failed to refresh DeckyZone state after reset', error)
    }

    applySnapshotUpdate(nextStatus, nextSettings)
    setUiRevision((revision) => revision + 1)

    return {
      result,
      glyphCleanupFailed,
    }
  }

  const handleRetryBootstrap = () => {
    const bootstrap = retryBootstrap()
    startUpdateNoticeAfterBootstrap(bootstrap, updateNoticeGeneration)
    syncBootstrapIntoLocalState()
    void bootstrap.then(() => {
      syncBootstrapIntoLocalState()
      if (isMountedRef.current && getBootstrapState().state === 'ready') {
        refreshStatusAfterActiveGameSync(RunningApps.active())
      }
    })
  }

  useEffect(() => {
    isMountedRef.current = true
    const remainingBatteryTimeAutoDisabledListener = addEventListener(
      REMAINING_BATTERY_TIME_AUTO_DISABLED_EVENT,
      () => {
        applySettingsUpdate((currentSettings) => ({
          ...currentSettings,
          remainingBatteryTimeFixEnabled: false,
        }))
      },
    )

    syncBootstrapIntoLocalState()
    void startBootstrap().then(async () => {
      if (!isMountedRef.current) {
        return
      }

      syncBootstrapIntoLocalState()
      if (getBootstrapState().state !== 'ready') {
        return
      }

      const settingsRevisionAtRequest = settingsRevisionRef.current
      try {
        const nextSettings = await getSettings()
        if (isMountedRef.current && settingsRevisionRef.current === settingsRevisionAtRequest) {
          applySettingsUpdate(nextSettings)
        }
      } catch (error) {
        console.error('Failed to refresh DeckyZone settings', error)
      }
      if (isMountedRef.current) {
        refreshStatusAfterActiveGameSync(RunningApps.active())
      }
    })
    setActiveGame((currentGame) => {
      const nextActiveGame = RunningApps.activeAppInfo() ?? getActiveGame()
      return areGamesEqual(currentGame, nextActiveGame) ? currentGame : nextActiveGame
    })
    const unregisterActiveGameListener = RunningApps.listenActiveChange((nextActiveGame) => {
      setActiveGame((currentGame) => (areGamesEqual(currentGame, nextActiveGame) ? currentGame : nextActiveGame))
      refreshStatusAfterActiveGameSync(nextActiveGame?.appid ?? DEFAULT_APP_ID)
    })
    return () => {
      isMountedRef.current = false
      unregisterActiveGameListener()
      removeEventListener(
        REMAINING_BATTERY_TIME_AUTO_DISABLED_EVENT,
        remainingBatteryTimeAutoDisabledListener,
      )
    }
  }, [])

  if (bootstrap.state === 'loading') {
    return (
      <PanelSection title="Controller">
        <PanelSectionRow>
          <SteamSpinner />
        </PanelSectionRow>
      </PanelSection>
    )
  }

  if (bootstrap.state === 'error') {
    return (
      <PanelSection title="Controller">
        <PanelSectionRow>
          <div style={{ color: 'red' }}>{bootstrap.message}</div>
        </PanelSectionRow>
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={handleRetryBootstrap}>
            Retry
          </ButtonItem>
        </PanelSectionRow>
      </PanelSection>
    )
  }

  if (!status || !settings) {
    return (
      <PanelSection title="Controller">
        <PanelSectionRow>
          <SteamSpinner />
        </PanelSectionRow>
      </PanelSection>
    )
  }

  const controllerPanel = (
    <ErrorBoundary title="Controller">
      <ControllerPanel
        activeGame={activeGame}
        settings={settings}
        status={status}
        onSettingsChange={applySettingsUpdate}
        onStatusChange={applyStatusUpdate}
      />
    </ErrorBoundary>
  )
  const interfacePanel = (
    <ErrorBoundary title="Interface">
      <InterfacePanel
        settings={settings}
        onSettingsChange={applySettingsUpdate}
      />
    </ErrorBoundary>
  )
  const displayPanel = (
    <ErrorBoundary title="Display">
      <DisplayPanel
        settings={settings}
        onSettingsChange={applySettingsUpdate}
      />
    </ErrorBoundary>
  )
  const performancePanel = (
    <ErrorBoundary title="Performance">
      <PerformancePanel
        settings={settings}
        onSettingsChange={applySettingsUpdate}
      />
    </ErrorBoundary>
  )
  const layoutPanel = (
    <ErrorBoundary title="Layout">
      <LayoutPanel
        settings={settings}
        onSettingsChange={applySettingsUpdate}
      />
    </ErrorBoundary>
  )
  const troubleshootingPanel = (
    <ErrorBoundary title="Troubleshooting">
      <TroubleshootingPanel onResetPlugin={handleResetPlugin} />
    </ErrorBoundary>
  )
  const updatesPanel = (
    <ErrorBoundary title="Updates">
      <UpdatesPanel installedVersionNum={settings.pluginVersionNum ?? ''} />
    </ErrorBoundary>
  )

  if (settings.legacyLayoutEnabled) {
    return (
      <Fragment key={`deckyzone-ui:${uiRevision}`}>
        {controllerPanel}
        {interfacePanel}
        {displayPanel}
        {performancePanel}
        {layoutPanel}
        {troubleshootingPanel}
        {updatesPanel}
      </Fragment>
    )
  }

  return (
    <Fragment key={`deckyzone-ui:${uiRevision}`}>
      <div style={mainTabsStyle}>
        <Tabs
          activeTab={activeTab}
          autoFocusContents
          onShowTab={(tabId: string) => {
            currentMainTab = tabId
            setActiveTab(tabId)
          }}
          tabs={[
            {
              id: 'controller',
              title: <TabIcon label="Controller"><FaGamepad size={20} /></TabIcon>,
              content: (
                <div style={tabContentStyle}>
                  {controllerPanel}
                </div>
              ),
            },
            {
              id: 'interface',
              title: <TabIcon label="Interface"><FaSlidersH size={20} /></TabIcon>,
              content: (
                <div style={tabContentStyle}>
                  {interfacePanel}
                </div>
              ),
            },
            {
              id: 'display',
              title: <TabIcon label="Display"><FaDesktop size={20} /></TabIcon>,
              content: (
                <div style={tabContentStyle}>
                  {displayPanel}
                </div>
              ),
            },
            {
              id: 'performance',
              title: <TabIcon label="Performance"><FaTachometerAlt size={20} /></TabIcon>,
              content: (
                <div style={tabContentStyle}>
                  {performancePanel}
                </div>
              ),
            },
            {
              id: 'more',
              title: <TabIcon label="More"><FaEllipsisH size={20} /></TabIcon>,
              content: (
                <div style={tabContentStyle}>
                  {layoutPanel}
                  {troubleshootingPanel}
                  {updatesPanel}
                </div>
              ),
            },
          ]}
        />
      </div>
    </Fragment>
  )
}

export default definePlugin(() => {
  routerHook.addRoute(DECKYZONE_ROUTE, SystemInformationPage, { exact: false })
  registerBrightnessDialFixListeners()
  RunningApps.register()
  updateNoticeGeneration += 1
  notifiedUpdateVersion = null
  const currentUpdateNoticeGeneration = updateNoticeGeneration
  const bootstrap = startBootstrap()
  startUpdateNoticeAfterBootstrap(bootstrap, currentUpdateNoticeGeneration)
  const unregisterHomeNavigationListener = addEventListener('zotac_home_short_pressed', () => {
    if (!homeButtonEnabled) {
      return
    }

    Navigation.Navigate('/library/home')
    Navigation.CloseSideMenus()
  })
  const unregisterActiveGameSync = RunningApps.listenActiveChange((nextActiveGame) => {
    void syncActiveGameTarget(nextActiveGame?.appid ?? DEFAULT_APP_ID)
  })
  void syncActiveGameTarget(RunningApps.active())

  return {
    name: 'DeckyZone',
    titleView: <QuickAccessTitleView title="DeckyZone" />,
    content: <Content />,
    icon: <ZotacIcon />,
    onDismount() {
      routerHook.removeRoute(DECKYZONE_ROUTE)
      updateNoticeGeneration += 1
      resetBootstrap()
      resetStartupCheck()
      removeEventListener('zotac_home_short_pressed', unregisterHomeNavigationListener)
      unregisterActiveGameSync()
      RunningApps.unregister()
      cleanupBrightnessDialFixListeners()
      void cleanupZotacGlyphsRuntime()
      console.log('DeckyZone unloaded')
    },
  }
})
