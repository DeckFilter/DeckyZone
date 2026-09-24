import { ButtonItem, Field } from '@decky/ui'
import type { ControllerMode, PluginSettings } from '../../types/plugin'
import { SettingsRow, useSettingsItemLayout } from '../SettingsSurface'
import { SteamExplainerToggleField } from '../SteamExplainer'

type Props = {
  settings: PluginSettings
  savingControllerMode: boolean
  savingHomeButton: boolean
  savingBrightnessDialFix: boolean
  onControllerModeChange: (mode: ControllerMode) => void
  onHomeButtonToggleChange: (enabled: boolean) => void
  onBrightnessDialFixToggleChange: (enabled: boolean) => void
}

const NO_GAMEPAD_MODE_DESCRIPTION = 'No Gamepad mode detected'
const CONTROLLER_MODE_GAMEPAD_DESCRIPTION = 'Current mode detected'
const CONTROLLER_MODE_DESKTOP_HINT = 'Switch back to Gamepad'
const CONTROLLER_MODE_UNKNOWN_DESCRIPTION = "Current mode couldn't be read"
const CONTROLLER_MODE_UNAVAILABLE_DESCRIPTION = 'Controller mode is unavailable'
const CONTROLLER_MODE_SWITCH_BUTTON = 'Switch to Gamepad'
const CONTROLLER_MODE_SWITCH_BUTTON_PENDING = 'Switching to Gamepad...'
const HOME_BUTTON_EXPLAINER = "Makes the Zotac Home button open Steam's Home screen."
const BRIGHTNESS_DIAL_EXPLAINER = 'Uses the right dial to control screen brightness.'
const INPUTPLUMBER_UNAVAILABLE_DESCRIPTION = 'InputPlumber is not available'

function isControllerModeConfirmed(settings: PluginSettings) {
  return settings.controllerModeAvailable && settings.controllerMode === 'gamepad'
}

function getControllerFeatureDescription(settings: PluginSettings, controllerModeBlocked: boolean) {
  if (!settings.inputplumberAvailable) {
    return INPUTPLUMBER_UNAVAILABLE_DESCRIPTION
  }

  if (controllerModeBlocked) {
    return NO_GAMEPAD_MODE_DESCRIPTION
  }

  return undefined
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
  savingHomeButton,
  savingBrightnessDialFix,
  onControllerModeChange,
  onHomeButtonToggleChange,
  onBrightnessDialFixToggleChange,
}: Props) => {
  const itemLayout = useSettingsItemLayout()
  const controllerModeConfirmed = isControllerModeConfirmed(settings)
  const controllerModeBlocked = !controllerModeConfirmed
  const controllerModeDisplay = getControllerModeDisplay(settings)
  const showControllerModeStatus = controllerModeBlocked
  const showControllerModeSwitchButton = settings.controllerModeAvailable && settings.controllerMode !== 'gamepad'
  const featureDescription = getControllerFeatureDescription(settings, controllerModeBlocked)
  const controllerFeatureDisabled = !settings.inputplumberAvailable || controllerModeBlocked

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
      <SettingsRow>
        <SteamExplainerToggleField
          label="Enable Home Button"
          explainerTitle="Home Button"
          explainer={HOME_BUTTON_EXPLAINER}
          settingsDescription="Opens Steam Home"
          checked={settings.homeButtonEnabled}
          onChange={(value: boolean) => onHomeButtonToggleChange(value)}
          disabled={savingHomeButton || controllerFeatureDisabled}
          description={featureDescription}
        />
      </SettingsRow>
      <SettingsRow>
        <SteamExplainerToggleField
          label="Enable Brightness Dial"
          explainerTitle="Brightness Dial"
          explainer={BRIGHTNESS_DIAL_EXPLAINER}
          settingsDescription="Controls brightness with the right dial"
          checked={settings.brightnessDialFixEnabled}
          onChange={(value: boolean) => onBrightnessDialFixToggleChange(value)}
          disabled={savingBrightnessDialFix || controllerFeatureDisabled}
          description={featureDescription}
        />
      </SettingsRow>
    </>
  )
}

export default ControllerTogglesPanel
