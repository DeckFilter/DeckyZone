import { ButtonItem, Field } from '@decky/ui'
import type { ControllerMode, PluginSettings } from '../../types/plugin'
import { SettingsRow, useSettingsItemLayout } from '../SettingsSurface'

type Props = {
  settings: PluginSettings
  savingControllerMode: boolean
  onControllerModeChange: (mode: ControllerMode) => void
}

const CONTROLLER_MODE_GAMEPAD_DESCRIPTION = 'Current mode detected'
const CONTROLLER_MODE_DESKTOP_HINT = 'Switch back to Gamepad'
const CONTROLLER_MODE_UNKNOWN_DESCRIPTION = "Current mode couldn't be read"
const CONTROLLER_MODE_UNAVAILABLE_DESCRIPTION = 'Controller mode is unavailable'
const CONTROLLER_MODE_SWITCH_BUTTON = 'Switch to Gamepad'
const CONTROLLER_MODE_SWITCH_BUTTON_PENDING = 'Switching to Gamepad...'

function isControllerModeConfirmed(settings: PluginSettings) {
  return settings.controllerModeAvailable && settings.controllerMode === 'gamepad'
}

function getControllerModeDisplay(settings: PluginSettings) {
  if (!settings.controllerModeAvailable) {
    return {
      value: 'Unavailable',
      description: CONTROLLER_MODE_UNAVAILABLE_DESCRIPTION,
    }
  }

  if (settings.controllerMode === null) {
    return {
      value: 'Unknown',
      description: CONTROLLER_MODE_UNKNOWN_DESCRIPTION,
    }
  }

  if (settings.controllerMode === 'desktop') {
    return {
      value: 'Desktop',
      description: CONTROLLER_MODE_DESKTOP_HINT,
    }
  }

  return {
    value: 'Gamepad',
    description: CONTROLLER_MODE_GAMEPAD_DESCRIPTION,
  }
}

const ControllerTogglesPanel = ({
  settings,
  savingControllerMode,
  onControllerModeChange,
}: Props) => {
  const itemLayout = useSettingsItemLayout()
  const controllerModeConfirmed = isControllerModeConfirmed(settings)
  const controllerModeBlocked = !controllerModeConfirmed
  const controllerModeDisplay = getControllerModeDisplay(settings)
  const showControllerModeStatus = controllerModeBlocked
  const showControllerModeSwitchButton = settings.controllerModeAvailable && settings.controllerMode !== 'gamepad'

  return (
    <>
      {showControllerModeStatus && (
        <>
          <SettingsRow>
            <Field focusable disabled label="Controller Mode" description={controllerModeDisplay.description}>
              {controllerModeDisplay.value}
            </Field>
          </SettingsRow>
          {showControllerModeSwitchButton && (
            <SettingsRow>
              <ButtonItem layout={itemLayout} onClick={() => onControllerModeChange('gamepad')} disabled={savingControllerMode}>
                {savingControllerMode ? CONTROLLER_MODE_SWITCH_BUTTON_PENDING : CONTROLLER_MODE_SWITCH_BUTTON}
              </ButtonItem>
            </SettingsRow>
          )}
        </>
      )}
    </>
  )
}

export default ControllerTogglesPanel
