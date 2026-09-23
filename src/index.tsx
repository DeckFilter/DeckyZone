import {
  ButtonItem,
  Navigation,
  Router,
  SteamSpinner,
  Tabs,
} from '@decky/ui'
import { addEventListener, callable, definePlugin, removeEventListener, routerHook } from '@decky/api'
import { Fragment, type ReactNode, useState } from 'react'
import { FaDesktop, FaEllipsisH, FaGamepad, FaSlidersH, FaTachometerAlt } from 'react-icons/fa'
import ControllerPanel from "./components/ControllerPanel"
import SystemInformationPage from "./pages/SystemInformationPage"
import DisplayPanel from "./components/DisplayPanel"
import ErrorBoundary from "./components/ErrorBoundary"
import InterfacePanel from "./components/InterfacePanel"
import LayoutPanel from './components/LayoutPanel'
import PerformancePanel from "./components/PerformancePanel"
import QuickAccessTitleView from "./components/QuickAccessTitleView"
import { SettingsRow, SettingsSection, SettingsSurfaceProvider } from './components/SettingsSurface'
import TroubleshootingPanel from "./components/TroubleshootingPanel"
import UpdatesPanel from "./components/UpdatesPanel"
import ZotacIcon from "./components/ZotacIcon"
import {
  cleanupZotacUiRuntime,
  syncStoredHideUnsupportedButtonsRuntimeEnabled,
  syncStoredZotacGlyphsRuntimeEnabled,
} from "./glyphs/zotacGlyphRuntime"
import { DECKYZONE_ROUTE } from './routes'
import {
  DeckyZoneState,
  DeckyZoneStateProvider,
  type PluginSettingsUpdate,
  useDeckyZoneState,
} from './state/DeckyZoneState'
import type { ActiveGame, PluginResetResult, PluginSettings, PluginStatus } from "./types/plugin"
import { checkLatestVersion, compareVersions, resetStartupCheck } from './utils/pluginUpdates'
import { showDeckyToast } from './utils/toasts'

type BrightnessDialDirection = 'up' | 'down'
type ActiveGameChangedHandler = (newGame: ActiveGame | null, oldGame: ActiveGame | null) => void
type UnregisterFn = () => void
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

function applySettingsRuntime(settings: PluginSettings) {
  setBrightnessDialFixRuntimeEnabled(settings.brightnessDialFixEnabled)
  setHomeButtonRuntimeEnabled(settings.homeButtonEnabled)
  syncStoredZotacGlyphsRuntimeEnabled(settings.zotacGlyphsEnabled)
  syncStoredHideUnsupportedButtonsRuntimeEnabled(settings.hideUnsupportedButtonsEnabled)
}

const deckyZoneState = new DeckyZoneState(applySettingsRuntime)

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
  return deckyZoneState.getSnapshot().bootstrap
}

function setBootstrapSnapshot(nextStatus: PluginStatus, nextSettings: PluginSettings) {
  deckyZoneState.setReady(nextStatus, nextSettings)
}

function cacheBootstrapStatus(nextStatus: PluginStatus) {
  deckyZoneState.updateStatus(nextStatus)
}

function cacheBootstrapSettings(nextSettings: PluginSettings) {
  deckyZoneState.updateSettings(nextSettings)
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
  deckyZoneState.setLoading()
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
      deckyZoneState.setError(
        `${error instanceof Error ? error.message : String(error)} Retry, or reload DeckyZone from Decky settings if this keeps happening.`,
      )
    })

  return bootstrapPromise
}

function retryBootstrap() {
  if (getBootstrapState().state === 'loading' && bootstrapPromise !== null) {
    return bootstrapPromise
  }

  bootstrapGeneration += 1
  bootstrapPromise = null
  deckyZoneState.setLoading()
  return startBootstrap()
}

function resetBootstrap() {
  bootstrapGeneration += 1
  bootstrapPromise = null
  deckyZoneState.reset()
}

function startUpdateNoticeAfterBootstrap(bootstrap: Promise<void>, generation: number) {
  void bootstrap.then(async () => {
    const bootstrapState = getBootstrapState()
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

async function handleResetPlugin() {
  let glyphCleanupFailed = false

  try {
    await cleanupZotacUiRuntime()
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

  setBootstrapSnapshot(nextStatus, nextSettings)
  deckyZoneState.bumpUiRevision()

  return {
    result,
    glyphCleanupFailed,
  }
}

async function refreshStateAfterBootstrap(bootstrap: Promise<void>) {
  await bootstrap
  const stateAfterBootstrap = deckyZoneState.getSnapshot()
  if (stateAfterBootstrap.bootstrap.state !== 'ready') {
    return
  }

  const settingsRevisionAtRequest = stateAfterBootstrap.settingsRevision
  try {
    const nextSettings = await getSettings()
    const currentState = deckyZoneState.getSnapshot()
    if (
      currentState.bootstrap.state === 'ready'
      && currentState.settingsRevision === settingsRevisionAtRequest
    ) {
      cacheBootstrapSettings(nextSettings)
    }
  } catch (error) {
    console.error('Failed to refresh DeckyZone settings', error)
  }

  await syncActiveGameTarget(RunningApps.active())
}

function handleRetryBootstrap() {
  const bootstrap = retryBootstrap()
  startUpdateNoticeAfterBootstrap(bootstrap, updateNoticeGeneration)
  void refreshStateAfterBootstrap(bootstrap)
}

function Content() {
  const { activeGame, bootstrap, store, uiRevision } = useDeckyZoneState()
  const [activeTab, setActiveTab] = useState(currentMainTab)
  const [latestVersionNum, setLatestVersionNum] = useState('')

  const applySettingsUpdate = (update: PluginSettingsUpdate) => {
    store.updateSettings(update)
  }

  const applyStatusUpdate = (nextStatus: PluginStatus) => {
    store.updateStatus(nextStatus)
  }

  if (bootstrap.state === 'loading') {
    return (
      <SettingsSection title="Controller">
        <SettingsRow>
          <SteamSpinner />
        </SettingsRow>
      </SettingsSection>
    )
  }

  if (bootstrap.state === 'error') {
    return (
      <SettingsSection title="Controller">
        <SettingsRow>
          <div style={{ color: 'red' }}>{bootstrap.message}</div>
        </SettingsRow>
        <SettingsRow>
          <ButtonItem layout="below" onClick={handleRetryBootstrap}>
            Retry
          </ButtonItem>
        </SettingsRow>
      </SettingsSection>
    )
  }

  const { settings, status } = bootstrap.snapshot
  const installedVersionNum = settings.pluginVersionNum ?? ''
  const showReinstallPlugin = Boolean(latestVersionNum)
    && compareVersions(latestVersionNum, installedVersionNum) === 0

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
      <TroubleshootingPanel
        onResetPlugin={handleResetPlugin}
        showReinstallPlugin={showReinstallPlugin}
      />
    </ErrorBoundary>
  )
  const updatesPanel = (
    <ErrorBoundary title="Updates">
      <UpdatesPanel
        installedVersionNum={installedVersionNum}
        onLatestVersionChange={setLatestVersionNum}
      />
    </ErrorBoundary>
  )

  if (settings.legacyLayoutEnabled) {
    return (
      <Fragment key={`deckyzone-ui:${uiRevision}`}>
        {controllerPanel}
        {interfacePanel}
        {displayPanel}
        {performancePanel}
        {updatesPanel}
        {troubleshootingPanel}
        {layoutPanel}
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
                  {updatesPanel}
                  {troubleshootingPanel}
                  {layoutPanel}
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
  const SettingsRoute = () => (
    <DeckyZoneStateProvider store={deckyZoneState}>
      <SettingsSurfaceProvider surface="settings">
        <SystemInformationPage
          onResetPlugin={handleResetPlugin}
          onRetryBootstrap={handleRetryBootstrap}
        />
      </SettingsSurfaceProvider>
    </DeckyZoneStateProvider>
  )

  routerHook.addRoute(DECKYZONE_ROUTE, SettingsRoute, { exact: false })
  registerBrightnessDialFixListeners()
  RunningApps.register()
  deckyZoneState.setActiveGame(RunningApps.activeAppInfo())
  updateNoticeGeneration += 1
  notifiedUpdateVersion = null
  const currentUpdateNoticeGeneration = updateNoticeGeneration
  const bootstrap = startBootstrap()
  startUpdateNoticeAfterBootstrap(bootstrap, currentUpdateNoticeGeneration)
  void refreshStateAfterBootstrap(bootstrap)
  const unregisterHomeNavigationListener = addEventListener('zotac_home_short_pressed', () => {
    if (!homeButtonEnabled) {
      return
    }

    Navigation.Navigate('/library/home')
    Navigation.CloseSideMenus()
  })
  const remainingBatteryTimeAutoDisabledListener = addEventListener(
    REMAINING_BATTERY_TIME_AUTO_DISABLED_EVENT,
    () => {
      deckyZoneState.updateSettings((currentSettings) => ({
        ...currentSettings,
        remainingBatteryTimeFixEnabled: false,
      }))
    },
  )
  const unregisterActiveGameSync = RunningApps.listenActiveChange((nextActiveGame) => {
    deckyZoneState.setActiveGame(nextActiveGame)
    void syncActiveGameTarget(nextActiveGame?.appid ?? DEFAULT_APP_ID)
  })

  return {
    name: 'DeckyZone',
    titleView: <QuickAccessTitleView title="DeckyZone" />,
    content: (
      <DeckyZoneStateProvider store={deckyZoneState}>
        <SettingsSurfaceProvider surface="quick-access">
          <Content />
        </SettingsSurfaceProvider>
      </DeckyZoneStateProvider>
    ),
    icon: <ZotacIcon />,
    onDismount() {
      routerHook.removeRoute(DECKYZONE_ROUTE)
      updateNoticeGeneration += 1
      resetBootstrap()
      resetStartupCheck()
      removeEventListener('zotac_home_short_pressed', unregisterHomeNavigationListener)
      removeEventListener(
        REMAINING_BATTERY_TIME_AUTO_DISABLED_EVENT,
        remainingBatteryTimeAutoDisabledListener,
      )
      unregisterActiveGameSync()
      RunningApps.unregister()
      cleanupBrightnessDialFixListeners()
      void cleanupZotacUiRuntime()
      console.log('DeckyZone unloaded')
    },
  }
})
