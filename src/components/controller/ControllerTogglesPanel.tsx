import { ButtonItem, DropdownItem, Field, PanelSectionRow, ToggleField } from '@decky/ui'
import type { ControllerMode, PluginSettings, TrackpadMode } from '../../types/plugin'

type Props = {
  settings: PluginSettings
  savingStartup: boolean
  savingControllerMode: boolean
  savingHomeButton: boolean
  savingBrightnessDialFix: boolean
  savingTrackpads: boolean
  onStartupToggleChange: (enabled: boolean) => void
  onControllerModeChange: (mode: ControllerMode) => void
  onHomeButtonToggleChange: (enabled: boolean) => void
  onBrightnessDialFixToggleChange: (enabled: boolean) => void
  onTrackpadModeChange: (mode: TrackpadMode) => void
}
type TrackpadModeOption = { data: TrackpadMode; label: string }

const CONTROLLER_FEATURES_DESCRIPTION = 'Turns on controller features'
const NO_GAMEPAD_MODE_DESCRIPTION = 'No Gamepad mode detected'
const CONTROLLER_MODE_GAMEPAD_DESCRIPTION = 'Current mode detected'
const CONTROLLER_MODE_DESKTOP_HINT = 'Switch back to Gamepad'
const CONTROLLER_MODE_UNKNOWN_DESCRIPTION = "Current mode couldn't be read"
const CONTROLLER_MODE_UNAVAILABLE_DESCRIPTION = 'Controller mode is unavailable'
const CONTROLLER_MODE_SWITCH_BUTTON = 'Switch to Gamepad'
const CONTROLLER_MODE_SWITCH_BUTTON_PENDING = 'Switching to Gamepad...'
const HOME_BUTTON_TOGGLE_DESCRIPTION = 'Navigates to Home'
const BRIGHTNESS_DIAL_FIX_DESCRIPTION = 'Controls screen brightness with the right dial'
const INPUTPLUMBER_UNAVAILABLE_DESCRIPTION = 'InputPlumber is not available'
const TRACKPAD_MODE_OPTIONS: TrackpadModeOption[] = [
  { data: 'mouse', label: 'Mouse' },
  { data: 'disabled', label: 'Disabled' },
  { data: 'directional_buttons', label: 'Directional Buttons' },
]

function getTrackpadModeDescription(mode: TrackpadMode) {
  switch (mode) {
    case 'disabled':
      return 'Turns off both trackpads'
    case 'directional_buttons':
      return 'Left pad is D-pad, right pad is A/B/X/Y'
    case 'mouse':
    default:
      return 'Left pad scrolls, right pad moves and clicks'
  }
}

function getTrackpadModeFieldDescription(settings: PluginSettings, controllerModeBlocked: boolean) {
  if (!settings.inputplumberAvailable) {
    return INPUTPLUMBER_UNAVAILABLE_DESCRIPTION
  }

  if (controllerModeBlocked) {
    return NO_GAMEPAD_MODE_DESCRIPTION
  }

  return getTrackpadModeDescription(settings.trackpadMode)
}

function isControllerModeConfirmed(settings: PluginSettings) {
  return settings.controllerModeAvailable && settings.controllerMode === 'gamepad'
}

function getStartupDescription(settings: PluginSettings, controllerModeBlocked: boolean) {
  if (!settings.inputplumberAvailable) {
    return INPUTPLUMBER_UNAVAILABLE_DESCRIPTION
  }

  if (controllerModeBlocked) {
    return NO_GAMEPAD_MODE_DESCRIPTION
  }

  return CONTROLLER_FEATURES_DESCRIPTION
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
  savingStartup,
  savingControllerMode,
  savingHomeButton,
  savingBrightnessDialFix,
  savingTrackpads,
  onStartupToggleChange,
  onControllerModeChange,
  onHomeButtonToggleChange,
  onBrightnessDialFixToggleChange,
  onTrackpadModeChange,
}: Props) => {
  const controllerModeConfirmed = isControllerModeConfirmed(settings)
  const controllerModeBlocked = !controllerModeConfirmed
  const controllerModeDisplay = getControllerModeDisplay(settings)
  const showControllerModeStatus = controllerModeBlocked
  const showControllerModeSwitchButton = settings.controllerModeAvailable && settings.controllerMode !== 'gamepad'
  const showControllerFeatureControls = settings.startupApplyEnabled && controllerModeConfirmed

  return (
    <>
      <PanelSectionRow>
        <ToggleField
          label="Enable Controller Features"
          checked={settings.startupApplyEnabled}
          onChange={(value: boolean) => onStartupToggleChange(value)}
          disabled={savingStartup || !settings.inputplumberAvailable || controllerModeBlocked}
          description={getStartupDescription(settings, controllerModeBlocked)}
        />
      </PanelSectionRow>
      {showControllerModeStatus && (
        <>
          <PanelSectionRow>
            <Field focusable disabled label="Controller Mode" description={controllerModeDisplay.description}>
              {controllerModeDisplay.value}
            </Field>
          </PanelSectionRow>
          {showControllerModeSwitchButton && (
            <PanelSectionRow>
              <ButtonItem layout="below" onClick={() => onControllerModeChange('gamepad')} disabled={savingControllerMode}>
                {savingControllerMode ? CONTROLLER_MODE_SWITCH_BUTTON_PENDING : CONTROLLER_MODE_SWITCH_BUTTON}
              </ButtonItem>
            </PanelSectionRow>
          )}
        </>
      )}
      <PanelSectionRow>
        <DropdownItem
          label="Trackpad Mode"
          menuLabel="Trackpad Mode"
          rgOptions={TRACKPAD_MODE_OPTIONS}
          selectedOption={settings.trackpadMode}
          disabled={savingTrackpads || !settings.inputplumberAvailable || controllerModeBlocked}
          description={getTrackpadModeFieldDescription(settings, controllerModeBlocked)}
          onChange={(option: { data: TrackpadMode }) => onTrackpadModeChange(option.data)}
        />
      </PanelSectionRow>
      {showControllerFeatureControls && (
        <>
          <PanelSectionRow>
            <ToggleField
              label="Enable Home Button"
              checked={settings.homeButtonEnabled}
              onChange={(value: boolean) => onHomeButtonToggleChange(value)}
              disabled={savingHomeButton || !settings.inputplumberAvailable}
              description={settings.inputplumberAvailable ? HOME_BUTTON_TOGGLE_DESCRIPTION : INPUTPLUMBER_UNAVAILABLE_DESCRIPTION}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ToggleField
              label="Enable Brightness Dial"
              checked={settings.brightnessDialFixEnabled}
              onChange={(value: boolean) => onBrightnessDialFixToggleChange(value)}
              disabled={savingBrightnessDialFix || !settings.inputplumberAvailable}
              description={settings.inputplumberAvailable ? BRIGHTNESS_DIAL_FIX_DESCRIPTION : INPUTPLUMBER_UNAVAILABLE_DESCRIPTION}
            />
          </PanelSectionRow>
        </>
      )}
    </>
  )
}

export default ControllerTogglesPanel
