import { callable } from '@decky/api'
import { PanelSection } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import ControllerTogglesPanel from './controller/ControllerTogglesPanel'
import PerGameSettingsPanel from './controller/PerGameSettingsPanel'
import RumblePanel from './controller/RumblePanel'
import type { ActiveGame, ControllerMode, PerGameRemapTarget, PluginSettings, PluginStatus } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'

type SteamInputDiagnosticAppDetails = {
  bShowControllerConfig?: boolean
  eEnableThirdPartyControllerConfiguration?: number
  eSteamInputControllerMask?: number
}

type SteamInputDiagnosticState =
  | { state: 'idle' }
  | { state: 'loading'; appId: string }
  | { state: 'ready'; appId: string; details: SteamInputDiagnosticAppDetails }
  | { state: 'unavailable'; appId: string; message: string }

type SteamAppsClient = {
  GetCachedAppDetails?: (appId: number) => Promise<unknown>
  RegisterForAppDetails?: (appId: number, callback: (details: unknown) => void) => { unregister?: () => void }
}

type Props = {
  activeGame: ActiveGame | null
  settings: PluginSettings
  status: PluginStatus
  onSettingsChange: (nextSettings: PluginSettings) => void
  onStatusChange: (nextStatus: PluginStatus) => void
}

const getStatus = callable<[], PluginStatus>('get_status')
const setStartupApplyEnabled = callable<[boolean], PluginSettings>('set_startup_apply_enabled')
const setControllerMode = callable<[ControllerMode], PluginSettings>('set_controller_mode')
const setHomeButtonEnabled = callable<[boolean], PluginSettings>('set_home_button_enabled')
const setBrightnessDialFixEnabled = callable<[boolean], PluginSettings>('set_brightness_dial_fix_enabled')
const setTrackpadsDisabled = callable<[boolean], PluginSettings>('set_trackpads_disabled')
const setPerGameSettingsEnabled = callable<[string, boolean], PluginSettings>('set_per_game_settings_enabled')
const setButtonPromptFixEnabled = callable<[string, boolean], PluginSettings>('set_button_prompt_fix_enabled')
const setPerGameTrackpadsDisabled = callable<[string, boolean], PluginSettings>('set_per_game_trackpads_disabled')
const setPerGameM1RemapTarget = callable<[string, PerGameRemapTarget], PluginSettings>('set_per_game_m1_remap_target')
const setPerGameM2RemapTarget = callable<[string, PerGameRemapTarget], PluginSettings>('set_per_game_m2_remap_target')
const syncPerGameTarget = callable<[string], boolean>('sync_per_game_target')
const setRumbleEnabled = callable<[boolean], PluginSettings>('set_rumble_enabled')
const setRumbleIntensity = callable<[number], PluginSettings>('set_rumble_intensity')
const testRumble = callable<[], boolean>('test_rumble')

const DEFAULT_APP_ID = '0'
const STEAM_INPUT_DIAGNOSTIC_UNAVAILABLE_MESSAGE = 'Steam Input state unavailable.'
const CONTROLLER_STATUS_FAILED_NOTICE = 'Controller failed to initialize. Restart device.'
const CONTROLLER_ACTION_FAILED_NOTICE = "Couldn't update setting."
const CONTROLLER_MODE_ACTION_FAILED_NOTICE = "Couldn't update mode."
const PER_GAME_SETTINGS_ACTION_FAILED_NOTICE = "Couldn't update per-game setting."
const BUTTON_PROMPT_FIX_ACTION_FAILED_NOTICE = "Couldn't update prompt fix."
const TRACKPADS_ACTION_FAILED_NOTICE = "Couldn't update trackpad setting."
const PER_GAME_REMAP_ACTION_FAILED_NOTICE = "Couldn't update M1/M2 remap."
const RUMBLE_ACTION_FAILED_NOTICE = "Couldn't update vibration."
const RUMBLE_TEST_FAILED_NOTICE = "Couldn't send vibration test."

function getControllerStatusNotice(status: PluginStatus) {
  if (status.state === 'unsupported') {
    return status.message
  }

  if (status.state === 'failed') {
    return CONTROLLER_STATUS_FAILED_NOTICE
  }

  return null
}

function isControllerModeConfirmed(settings: PluginSettings) {
  return settings.controllerModeAvailable && settings.controllerMode === 'gamepad'
}

function normalizeSteamInputDiagnosticDetails(rawDetails: unknown): SteamInputDiagnosticAppDetails | null {
  let parsedDetails = rawDetails

  if (typeof parsedDetails === 'string') {
    try {
      parsedDetails = JSON.parse(parsedDetails)
    } catch {
      return null
    }
  }

  if (!parsedDetails || typeof parsedDetails !== 'object') {
    return null
  }

  const details = parsedDetails as Record<string, unknown>
  const thirdPartyControllerConfiguration = details.eEnableThirdPartyControllerConfiguration
  const steamInputControllerMask = details.eSteamInputControllerMask
  const showControllerConfig = details.bShowControllerConfig

  if (
    typeof thirdPartyControllerConfiguration !== 'number' &&
    typeof steamInputControllerMask !== 'number' &&
    typeof showControllerConfig !== 'boolean'
  ) {
    return null
  }

  return {
    bShowControllerConfig: typeof showControllerConfig === 'boolean' ? showControllerConfig : undefined,
    eEnableThirdPartyControllerConfiguration:
      typeof thirdPartyControllerConfiguration === 'number' ? thirdPartyControllerConfiguration : undefined,
    eSteamInputControllerMask: typeof steamInputControllerMask === 'number' ? steamInputControllerMask : undefined,
  }
}

function getSteamInputDiagnosticStatus(details: SteamInputDiagnosticAppDetails) {
  switch (details.eEnableThirdPartyControllerConfiguration) {
    case 0:
      return details.bShowControllerConfig === false ? 'Steam Input disabled' : 'Mixed or unknown Steam Input state'
    case 1:
      return details.bShowControllerConfig === true ? 'Steam Input enabled/default' : 'Mixed or unknown Steam Input state'
    case 2:
      return 'Steam Input enabled/forced'
    default:
      return 'Mixed or unknown Steam Input state'
  }
}

async function syncActiveGameTarget(appId: string) {
  try {
    await syncPerGameTarget(appId)
  } catch (error) {
    console.error('Failed to sync per-game target', error)
  }
}

const ControllerPanel = ({ activeGame, settings, status, onSettingsChange, onStatusChange }: Props) => {
  const [rumbleIntensityDraft, setRumbleIntensityDraft] = useState(settings.rumbleIntensity)
  const [controllerNotice, setControllerNotice] = useState<string | null>(null)
  const [perGameNotice, setPerGameNotice] = useState<string | null>(null)
  const [savingStartup, setSavingStartup] = useState(false)
  const [savingControllerMode, setSavingControllerMode] = useState(false)
  const [savingHomeButton, setSavingHomeButton] = useState(false)
  const [savingBrightnessDialFix, setSavingBrightnessDialFix] = useState(false)
  const [savingTrackpads, setSavingTrackpads] = useState(false)
  const [savingPerGameSettings, setSavingPerGameSettings] = useState(false)
  const [savingButtonPromptFix, setSavingButtonPromptFix] = useState(false)
  const [savingPerGameTrackpads, setSavingPerGameTrackpads] = useState(false)
  const [savingPerGameRemaps, setSavingPerGameRemaps] = useState(false)
  const [savingRumble, setSavingRumble] = useState(false)
  const [savingRumbleIntensity, setSavingRumbleIntensity] = useState(false)
  const [testingRumble, setTestingRumble] = useState(false)
  const [rumbleMessage, setRumbleMessage] = useState<string | null>(null)
  const [rumbleMessageKind, setRumbleMessageKind] = useState<'success' | 'error' | null>(null)
  const [steamInputDiagnostic, setSteamInputDiagnostic] = useState<SteamInputDiagnosticState>({ state: 'idle' })
  const rumbleIntensityLatestValue = useRef(settings.rumbleIntensity)
  const rumbleIntensityCommittedValue = useRef(settings.rumbleIntensity)
  const rumbleIntensitySaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rumbleIntensityStateVersion = useRef(0)
  const rumbleIntensityQueuedVersion = useRef<number | null>(null)
  const rumbleIntensityQueuedPromise = useRef<Promise<boolean> | null>(null)
  const rumbleIntensitySaveChain = useRef<Promise<boolean>>(Promise.resolve(true))
  const rumbleIntensityActiveSaveCount = useRef(0)

  const clearPendingRumbleIntensitySave = () => {
    if (rumbleIntensitySaveTimeout.current !== null) {
      clearTimeout(rumbleIntensitySaveTimeout.current)
      rumbleIntensitySaveTimeout.current = null
    }
  }

  const loadStatus = async () => {
    const nextStatus = await getStatus()
    onStatusChange(nextStatus)
  }

  const controllerStatusNotice = getControllerStatusNotice(status)

  useDeckyToastNotice(
    controllerStatusNotice
      ? {
          activeKey: `controller-status:${status.state}:${status.message}`,
          title: 'Controller',
          body: controllerStatusNotice,
          severity: 'warning',
        }
      : null,
  )

  useDeckyToastNotice(
    controllerNotice
      ? {
          activeKey: `controller-action:${controllerNotice}`,
          title: 'Controller',
          body: controllerNotice,
          severity: 'error',
        }
      : null,
  )

  useDeckyToastNotice(
    perGameNotice
      ? {
          activeKey: `controller-per-game:${perGameNotice}`,
          title: 'Controller',
          body: perGameNotice,
          severity: 'error',
        }
      : null,
  )

  useDeckyToastNotice(
    rumbleMessage && rumbleMessageKind === 'error'
      ? {
          activeKey: `controller-rumble:error:${rumbleMessage}`,
          title: 'Controller',
          body: rumbleMessage,
          severity: 'error',
        }
      : null,
  )

  useEffect(() => {
    setRumbleIntensityDraft(settings.rumbleIntensity)
    rumbleIntensityLatestValue.current = settings.rumbleIntensity
    rumbleIntensityCommittedValue.current = settings.rumbleIntensity
    if (!settings.rumbleAvailable) {
      setRumbleMessage(null)
      setRumbleMessageKind(null)
    }
  }, [settings.rumbleIntensity, settings.rumbleAvailable])

  useEffect(() => {
    return () => {
      clearPendingRumbleIntensitySave()
    }
  }, [])

  const handleStartupToggleChange = async (enabled: boolean) => {
    setControllerNotice(null)
    setSavingStartup(true)
    try {
      const nextSettings = await setStartupApplyEnabled(enabled)
      onSettingsChange(nextSettings)
      setControllerNotice(null)
      await loadStatus()
      await syncActiveGameTarget(activeGame?.appid ?? DEFAULT_APP_ID)
    } catch {
      setControllerNotice(CONTROLLER_ACTION_FAILED_NOTICE)
    } finally {
      setSavingStartup(false)
    }
  }

  const handleHomeButtonToggleChange = async (enabled: boolean) => {
    setControllerNotice(null)
    setSavingHomeButton(true)
    try {
      const nextSettings = await setHomeButtonEnabled(enabled)
      onSettingsChange(nextSettings)
      setControllerNotice(null)
    } catch {
      setControllerNotice(CONTROLLER_ACTION_FAILED_NOTICE)
    } finally {
      setSavingHomeButton(false)
    }
  }

  const handleControllerModeChange = async (mode: ControllerMode) => {
    setControllerNotice(null)
    setSavingControllerMode(true)
    try {
      const nextSettings = await setControllerMode(mode)
      onSettingsChange(nextSettings)
      setControllerNotice(null)
      await loadStatus()
      await syncActiveGameTarget(activeGame?.appid ?? DEFAULT_APP_ID)
    } catch {
      setControllerNotice(CONTROLLER_MODE_ACTION_FAILED_NOTICE)
    } finally {
      setSavingControllerMode(false)
    }
  }

  const handleBrightnessDialFixToggleChange = async (enabled: boolean) => {
    setControllerNotice(null)
    setSavingBrightnessDialFix(true)
    try {
      const nextSettings = await setBrightnessDialFixEnabled(enabled)
      onSettingsChange(nextSettings)
      setControllerNotice(null)
    } catch {
      setControllerNotice(CONTROLLER_ACTION_FAILED_NOTICE)
    } finally {
      setSavingBrightnessDialFix(false)
    }
  }

  const handleTrackpadsToggleChange = async (disabled: boolean) => {
    setControllerNotice(null)
    setSavingTrackpads(true)
    try {
      const nextSettings = await setTrackpadsDisabled(disabled)
      onSettingsChange(nextSettings)
      setControllerNotice(null)
      await syncActiveGameTarget(activeGame?.appid ?? DEFAULT_APP_ID)
    } catch {
      setControllerNotice(TRACKPADS_ACTION_FAILED_NOTICE)
    } finally {
      setSavingTrackpads(false)
    }
  }

  const handlePerGameSettingsToggleChange = async (enabled: boolean) => {
    if (!activeGame) {
      return
    }

    setPerGameNotice(null)
    setSavingPerGameSettings(true)
    try {
      const nextSettings = await setPerGameSettingsEnabled(activeGame.appid, enabled)
      onSettingsChange(nextSettings)
      setPerGameNotice(null)
      await syncActiveGameTarget(activeGame.appid)
    } catch {
      setPerGameNotice(PER_GAME_SETTINGS_ACTION_FAILED_NOTICE)
    } finally {
      setSavingPerGameSettings(false)
    }
  }

  const handleButtonPromptFixToggleChange = async (enabled: boolean) => {
    if (!activeGame) {
      return
    }

    setPerGameNotice(null)
    setSavingButtonPromptFix(true)
    try {
      const nextSettings = await setButtonPromptFixEnabled(activeGame.appid, enabled)
      onSettingsChange(nextSettings)
      setPerGameNotice(null)
      await syncActiveGameTarget(activeGame.appid)
    } catch {
      setPerGameNotice(BUTTON_PROMPT_FIX_ACTION_FAILED_NOTICE)
    } finally {
      setSavingButtonPromptFix(false)
    }
  }

  const handlePerGameTrackpadsChange = async (disabled: boolean) => {
    if (!activeGame || !isPerGameSettingsEnabled) {
      return
    }

    setPerGameNotice(null)
    setSavingPerGameTrackpads(true)
    try {
      const nextSettings = await setPerGameTrackpadsDisabled(activeGame.appid, disabled)
      onSettingsChange(nextSettings)
      setPerGameNotice(null)
      await syncActiveGameTarget(activeGame.appid)
    } catch {
      setPerGameNotice(TRACKPADS_ACTION_FAILED_NOTICE)
    } finally {
      setSavingPerGameTrackpads(false)
    }
  }

  const handlePerGameM1RemapTargetChange = async (target: PerGameRemapTarget) => {
    if (!activeGame || !isPerGameSettingsEnabled || !isButtonPromptFixEnabled) {
      return
    }

    setPerGameNotice(null)
    setSavingPerGameRemaps(true)
    try {
      const nextSettings = await setPerGameM1RemapTarget(activeGame.appid, target)
      onSettingsChange(nextSettings)
      setPerGameNotice(null)
      await syncActiveGameTarget(activeGame.appid)
    } catch {
      setPerGameNotice(PER_GAME_REMAP_ACTION_FAILED_NOTICE)
    } finally {
      setSavingPerGameRemaps(false)
    }
  }

  const handlePerGameM2RemapTargetChange = async (target: PerGameRemapTarget) => {
    if (!activeGame || !isPerGameSettingsEnabled || !isButtonPromptFixEnabled) {
      return
    }

    setPerGameNotice(null)
    setSavingPerGameRemaps(true)
    try {
      const nextSettings = await setPerGameM2RemapTarget(activeGame.appid, target)
      onSettingsChange(nextSettings)
      setPerGameNotice(null)
      await syncActiveGameTarget(activeGame.appid)
    } catch {
      setPerGameNotice(PER_GAME_REMAP_ACTION_FAILED_NOTICE)
    } finally {
      setSavingPerGameRemaps(false)
    }
  }

  const handleRumbleToggleChange = async (enabled: boolean) => {
    rumbleIntensityStateVersion.current += 1

    if (!enabled) {
      clearPendingRumbleIntensitySave()
    }

    setRumbleMessage(null)
    setRumbleMessageKind(null)
    setSavingRumble(true)
    try {
      const nextSettings = await setRumbleEnabled(enabled)
      onSettingsChange(nextSettings)
      setRumbleIntensityDraft(nextSettings.rumbleIntensity)
      rumbleIntensityLatestValue.current = nextSettings.rumbleIntensity
      setRumbleMessage(null)
      setRumbleMessageKind(null)
    } catch {
      setRumbleMessage(RUMBLE_ACTION_FAILED_NOTICE)
      setRumbleMessageKind('error')
    } finally {
      setSavingRumble(false)
    }
  }

  const beginRumbleIntensitySave = () => {
    rumbleIntensityActiveSaveCount.current += 1
    setSavingRumbleIntensity(true)
  }

  const finishRumbleIntensitySave = () => {
    rumbleIntensityActiveSaveCount.current = Math.max(0, rumbleIntensityActiveSaveCount.current - 1)
    if (rumbleIntensityActiveSaveCount.current === 0) {
      setSavingRumbleIntensity(false)
    }
  }

  const saveRumbleIntensity = async (value: number, version: number) => {
    beginRumbleIntensitySave()
    try {
      const nextSettings = await setRumbleIntensity(value)
      if (version === rumbleIntensityStateVersion.current) {
        rumbleIntensityCommittedValue.current = nextSettings.rumbleIntensity
        rumbleIntensityLatestValue.current = nextSettings.rumbleIntensity
        setRumbleIntensityDraft(nextSettings.rumbleIntensity)
        onSettingsChange(nextSettings)
        setRumbleMessage(null)
        setRumbleMessageKind(null)
      }
      return true
    } catch {
      if (version === rumbleIntensityStateVersion.current) {
        setRumbleMessage(RUMBLE_ACTION_FAILED_NOTICE)
        setRumbleMessageKind('error')
      }
      return false
    } finally {
      finishRumbleIntensitySave()
    }
  }

  const queueRumbleIntensitySave = (value: number, version: number) => {
    if (rumbleIntensityQueuedVersion.current === version && rumbleIntensityQueuedPromise.current) {
      return rumbleIntensityQueuedPromise.current
    }

    const nextSave = rumbleIntensitySaveChain.current
      .catch(() => false)
      .then(() => saveRumbleIntensity(value, version))

    const trackedSave = nextSave.finally(() => {
      if (rumbleIntensityQueuedVersion.current === version) {
        rumbleIntensityQueuedVersion.current = null
        rumbleIntensityQueuedPromise.current = null
      }
    })

    rumbleIntensitySaveChain.current = trackedSave
    rumbleIntensityQueuedVersion.current = version
    rumbleIntensityQueuedPromise.current = trackedSave
    return trackedSave
  }

  const flushPendingRumbleIntensitySave = async () => {
    clearPendingRumbleIntensitySave()

    const latestValue = rumbleIntensityLatestValue.current
    const latestVersion = rumbleIntensityStateVersion.current

    if (latestValue === rumbleIntensityCommittedValue.current && !savingRumbleIntensity) {
      return true
    }

    return await queueRumbleIntensitySave(latestValue, latestVersion)
  }

  const handleRumbleIntensityChange = (value: number) => {
    const nextVersion = rumbleIntensityStateVersion.current + 1
    rumbleIntensityStateVersion.current = nextVersion
    setRumbleIntensityDraft(value)
    rumbleIntensityLatestValue.current = value
    setRumbleMessage(null)
    setRumbleMessageKind(null)
    clearPendingRumbleIntensitySave()
    rumbleIntensitySaveTimeout.current = setTimeout(() => {
      rumbleIntensitySaveTimeout.current = null
      void queueRumbleIntensitySave(value, nextVersion)
    }, 500)
  }

  const handleTestRumble = async () => {
    setRumbleMessage(null)
    setRumbleMessageKind(null)

    const didFlushIntensity = await flushPendingRumbleIntensitySave()
    if (!didFlushIntensity) {
      return
    }

    setTestingRumble(true)
    try {
      const success = await testRumble()
      if (!success) {
        setRumbleMessage(RUMBLE_TEST_FAILED_NOTICE)
        setRumbleMessageKind('error')
      }
    } catch {
      setRumbleMessage(RUMBLE_TEST_FAILED_NOTICE)
      setRumbleMessageKind('error')
    } finally {
      setTestingRumble(false)
    }
  }

  const activeGamePerGameSettings = activeGame ? settings.perGameSettings[activeGame.appid] : undefined
  const controllerFeaturesEnabled = settings.startupApplyEnabled && isControllerModeConfirmed(settings)
  const isPerGameSettingsEnabled = activeGamePerGameSettings?.enabled ?? false
  const isButtonPromptFixEnabled = activeGamePerGameSettings?.buttonPromptFixEnabled ?? false
  const isTrackpadsDisabled = activeGamePerGameSettings?.disableTrackpads ?? false
  const m1RemapTarget = activeGamePerGameSettings?.m1RemapTarget ?? 'none'
  const m2RemapTarget = activeGamePerGameSettings?.m2RemapTarget ?? 'none'

  useEffect(() => {
    if (!activeGame || !isPerGameSettingsEnabled || !isButtonPromptFixEnabled) {
      setSteamInputDiagnostic({ state: 'idle' })
      return
    }

    const steamApps = window.SteamClient?.Apps as SteamAppsClient | undefined
    const numericAppId = Number(activeGame.appid)

    if (!steamApps?.GetCachedAppDetails || Number.isNaN(numericAppId)) {
      setSteamInputDiagnostic({
        state: 'unavailable',
        appId: activeGame.appid,
        message: STEAM_INPUT_DIAGNOSTIC_UNAVAILABLE_MESSAGE,
      })
      return
    }

    let cancelled = false
    setSteamInputDiagnostic({ state: 'loading', appId: activeGame.appid })

    const updateDiagnosticDetails = (rawDetails: unknown) => {
      if (cancelled) {
        return
      }

      const nextDetails = normalizeSteamInputDiagnosticDetails(rawDetails)
      if (!nextDetails) {
        setSteamInputDiagnostic({
          state: 'unavailable',
          appId: activeGame.appid,
          message: STEAM_INPUT_DIAGNOSTIC_UNAVAILABLE_MESSAGE,
        })
        return
      }

      setSteamInputDiagnostic({
        state: 'ready',
        appId: activeGame.appid,
        details: nextDetails,
      })
    }

    void steamApps
      .GetCachedAppDetails(numericAppId)
      .then((details) => {
        updateDiagnosticDetails(details)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setSteamInputDiagnostic({
          state: 'unavailable',
          appId: activeGame.appid,
          message: STEAM_INPUT_DIAGNOSTIC_UNAVAILABLE_MESSAGE,
        })
      })

    const registration = steamApps.RegisterForAppDetails?.(numericAppId, (details) => {
      updateDiagnosticDetails(details)
    })

    return () => {
      cancelled = true
      registration?.unregister?.()
    }
  }, [activeGame, isPerGameSettingsEnabled, isButtonPromptFixEnabled])

  const shouldShowSteamInputDisabledWarning =
    steamInputDiagnostic.state === 'ready' && getSteamInputDiagnosticStatus(steamInputDiagnostic.details) === 'Steam Input disabled'
  const isButtonPromptFixActive = settings.inputplumberAvailable && isPerGameSettingsEnabled && isButtonPromptFixEnabled
  const controllerSpinner = savingControllerMode || savingRumbleIntensity

  return (
    <PanelSection title="Controller" spinner={controllerSpinner}>
      <ControllerTogglesPanel
        settings={settings}
        savingStartup={savingStartup}
        savingControllerMode={savingControllerMode}
        savingHomeButton={savingHomeButton}
        savingBrightnessDialFix={savingBrightnessDialFix}
        savingTrackpads={savingTrackpads}
        onStartupToggleChange={(value: boolean) => void handleStartupToggleChange(value)}
        onControllerModeChange={(value: ControllerMode) => void handleControllerModeChange(value)}
        onHomeButtonToggleChange={(value: boolean) => void handleHomeButtonToggleChange(value)}
        onBrightnessDialFixToggleChange={(value: boolean) => void handleBrightnessDialFixToggleChange(value)}
        onTrackpadsToggleChange={(value: boolean) => void handleTrackpadsToggleChange(value)}
      />
      {controllerFeaturesEnabled && (
        <>
          <RumblePanel
            settings={settings}
            savingRumble={savingRumble}
            savingRumbleIntensity={savingRumbleIntensity}
            testingRumble={testingRumble}
            rumbleIntensityDraft={rumbleIntensityDraft}
            onRumbleToggleChange={(value: boolean) => void handleRumbleToggleChange(value)}
            onRumbleIntensityChange={handleRumbleIntensityChange}
            onTestRumble={() => void handleTestRumble()}
          />
          <PerGameSettingsPanel
            activeGame={activeGame}
            inputplumberAvailable={settings.inputplumberAvailable}
            isPerGameSettingsEnabled={isPerGameSettingsEnabled}
            isButtonPromptFixEnabled={isButtonPromptFixEnabled}
            isButtonPromptFixActive={isButtonPromptFixActive}
            isTrackpadsDisabled={isTrackpadsDisabled}
            m1RemapTarget={m1RemapTarget}
            m2RemapTarget={m2RemapTarget}
            savingPerGameSettings={savingPerGameSettings}
            savingButtonPromptFix={savingButtonPromptFix}
            savingPerGameTrackpads={savingPerGameTrackpads}
            savingPerGameRemaps={savingPerGameRemaps}
            shouldShowSteamInputDisabledWarning={shouldShowSteamInputDisabledWarning}
            onPerGameSettingsToggleChange={(value: boolean) => void handlePerGameSettingsToggleChange(value)}
            onButtonPromptFixToggleChange={(value: boolean) => void handleButtonPromptFixToggleChange(value)}
            onPerGameTrackpadsChange={(value: boolean) => void handlePerGameTrackpadsChange(value)}
            onPerGameM1RemapTargetChange={(value: PerGameRemapTarget) => void handlePerGameM1RemapTargetChange(value)}
            onPerGameM2RemapTargetChange={(value: PerGameRemapTarget) => void handlePerGameM2RemapTargetChange(value)}
          />
        </>
      )}
    </PanelSection>
  )
}

export default ControllerPanel
