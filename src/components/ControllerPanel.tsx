import { callable } from '@decky/api'
import { useState } from 'react'
import type { PluginSettingsUpdate } from '../state/DeckyZoneState'
import { SteamExplainerButtonItem, SteamExplainerToggleField } from './SteamExplainer'
import { openControllerMapping } from '../routes'
import { SettingsGroup, SettingsPanel, SettingsRow, useSettingsSurface } from './SettingsSurface'
import ControllerTogglesPanel from './controller/ControllerTogglesPanel'
import PerGameSettingsPanel from './controller/PerGameSettingsPanel'
import RumblePanel from './controller/RumblePanel'
import useGameControllerSettings from './controller/useGameControllerSettings'
import type { ActiveGame, ControllerMode, PluginSettings, PluginStatus } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'

type Props = {
  activeGame: ActiveGame | null
  settings: PluginSettings
  status: PluginStatus
  onSettingsChange: (update: PluginSettingsUpdate) => void
  onStatusChange: (nextStatus: PluginStatus) => void
}

const getStatus = callable<[], PluginStatus>('get_status')
const setControllerMode = callable<[ControllerMode], PluginSettings>('set_controller_mode')
const setGyroMountMatrixFixEnabled = callable<[boolean], PluginSettings>('set_gyro_mount_matrix_fix_enabled')
const syncPerGameTarget = callable<[string], boolean>('sync_per_game_target')

const DEFAULT_APP_ID = '0'
const CONTROLLER_STATUS_FAILED_NOTICE = 'Controller failed to initialize. Restart device.'
const CONTROLLER_MODE_ACTION_FAILED_NOTICE = "Couldn't update mode."
const GYRO_MOUNT_MATRIX_FIX_ACTION_FAILED_NOTICE = "Couldn't update gyro orientation fix."
const INPUTPLUMBER_UNAVAILABLE_DESCRIPTION = 'InputPlumber is not available'
const GYRO_MOUNT_MATRIX_FIX_EXPLAINER =
  "Corrects the ZONE's gyro orientation. Changing this setting restarts InputPlumber."
const GYRO_MOUNT_MATRIX_FIX_BUILT_IN_DESCRIPTION = 'InputPlumber includes this fix; you can turn this off'

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

function getGyroMountMatrixFixDescription(settings: PluginSettings) {
  const state = settings.gyroMountMatrixFix
  if (state.blockedReason) {
    return state.blockedReason
  }

  if (!settings.inputplumberAvailable) {
    return INPUTPLUMBER_UNAVAILABLE_DESCRIPTION
  }

  if (state.enabled && state.builtIn) {
    return GYRO_MOUNT_MATRIX_FIX_BUILT_IN_DESCRIPTION
  }

  return undefined
}

async function syncActiveGameTarget(appId: string) {
  try {
    await syncPerGameTarget(appId)
  } catch (error) {
    console.error('Failed to sync per-game target', error)
  }
}

const ControllerPanel = ({ activeGame, settings, status, onSettingsChange, onStatusChange }: Props) => {
  const isQuickAccess = useSettingsSurface() === 'quick-access'
  const [controllerNotice, setControllerNotice] = useState<string | null>(null)
  const [savingControllerMode, setSavingControllerMode] = useState(false)
  const [savingGyroMountMatrixFix, setSavingGyroMountMatrixFix] = useState(false)
  const controls = useGameControllerSettings({
    appId: activeGame?.appid ?? '0',
    settings,
    onSettingsChange,
    mode: isQuickAccess ? 'quick-access' : 'global',
    disabled: savingControllerMode || savingGyroMountMatrixFix,
  })

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

  const handleGyroMountMatrixFixToggleChange = async (enabled: boolean) => {
    setControllerNotice(null)
    setSavingGyroMountMatrixFix(true)
    try {
      const nextSettings = await setGyroMountMatrixFixEnabled(enabled)
      onSettingsChange(nextSettings)
      setControllerNotice(null)
      await loadStatus()
      await syncActiveGameTarget(activeGame?.appid ?? DEFAULT_APP_ID)
    } catch {
      setControllerNotice(GYRO_MOUNT_MATRIX_FIX_ACTION_FAILED_NOTICE)
    } finally {
      setSavingGyroMountMatrixFix(false)
    }
  }

  const controllerSpinner = savingControllerMode || savingGyroMountMatrixFix || controls.saving
  const mappingDisabled = !settings.inputplumberAvailable || !isControllerModeConfirmed(settings)
  const gyroMountMatrixFixDisabled =
    savingGyroMountMatrixFix
    || controls.busy
    || !settings.inputplumberAvailable
    || (!settings.gyroMountMatrixFix.available && !settings.gyroMountMatrixFix.enabled)

  return (
    <SettingsPanel title="Controller" spinner={controllerSpinner}>
      {!isControllerModeConfirmed(settings) && (
        <SettingsGroup>
          <ControllerTogglesPanel
            settings={settings}
            savingControllerMode={savingControllerMode || controls.busy}
            onControllerModeChange={(value: ControllerMode) => void handleControllerModeChange(value)}
          />
        </SettingsGroup>
      )}
      {isQuickAccess && (
        <SettingsGroup title="Game Overrides">
          <PerGameSettingsPanel
            activeGame={activeGame}
            inputplumberAvailable={settings.inputplumberAvailable}
            isPerGameSettingsEnabled={controls.isPerGameSettingsEnabled}
            isButtonPromptFixEnabled={controls.isButtonPromptFixEnabled}
            savingPerGameSettings={controls.controlsDisabled}
            savingButtonPromptFix={controls.controlsDisabled}
            onPerGameSettingsToggleChange={controls.setPerGameEnabled}
            onButtonPromptFixToggleChange={controls.setButtonPromptFixEnabled}
          />
        </SettingsGroup>
      )}
      <SettingsGroup title="Input">
        <SettingsRow>
          <SteamExplainerButtonItem
            layout={isQuickAccess ? 'below' : 'inline'}
            childrenContainerWidth={isQuickAccess ? 'max' : 'fixed'}
            label="Controller settings"
            disabled={mappingDisabled || controls.busy}
            explainerTitle="Controller settings"
            explainer={isQuickAccess && activeGame
              ? `Configure dials, trackpads, rumble and Xbox controller simulation for ${activeGame.display_name}.`
              : 'Configure global buttons, dials, trackpads and rumble, or edit saved game settings including Xbox controller simulation.'}
            onClick={() => openControllerMapping(isQuickAccess ? activeGame?.appid ?? '0' : '0')}
          >
            Edit settings
          </SteamExplainerButtonItem>
        </SettingsRow>

        {settings.gyroMountMatrixFix.visible && (
          <SettingsRow>
            <SteamExplainerToggleField
              label="Gyro Orientation Fix"
              explainerTitle="Gyro Orientation Fix"
              explainer={GYRO_MOUNT_MATRIX_FIX_EXPLAINER}
              checked={settings.gyroMountMatrixFix.enabled}
              onChange={(value: boolean) => void handleGyroMountMatrixFixToggleChange(value)}
              disabled={gyroMountMatrixFixDisabled}
              description={getGyroMountMatrixFixDescription(settings)}
            />
          </SettingsRow>
        )}
      </SettingsGroup>
      <SettingsGroup title="Rumble">
        <RumblePanel
          scopeDescription={controls.rumbleAppId === '0' ? 'Global settings' : activeGame?.display_name}
          inputplumberAvailable={settings.inputplumberAvailable}
          rumbleEnabled={controls.rumbleEnabled}
          rumbleAvailable={settings.rumbleAvailable}
          savingRumble={controls.controlsDisabled}
          savingRumbleIntensity={controls.saving}
          testingRumble={controls.testingRumble}
          rumbleIntensityDraft={controls.rumbleIntensity}
          onRumbleToggleChange={controls.setRumbleEnabled}
          onRumbleIntensityChange={controls.setRumbleIntensity}
          onTestRumble={controls.testRumble}
        />
      </SettingsGroup>
    </SettingsPanel>
  )
}

export default ControllerPanel
