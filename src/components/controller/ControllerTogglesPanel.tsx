import { DropdownItem, PanelSectionRow, ToggleField } from '@decky/ui'
import type { ControllerMode, PluginSettings } from '../../types/plugin'

type Props = {
  settings: PluginSettings
  savingStartup: boolean
  savingControllerMode: boolean
  savingHomeButton: boolean
  savingBrightnessDialFix: boolean
  onStartupToggleChange: (enabled: boolean) => void
  onControllerModeChange: (mode: ControllerMode) => void
  onHomeButtonToggleChange: (enabled: boolean) => void
  onBrightnessDialFixToggleChange: (enabled: boolean) => void
}

const CONTROLLER_FEATURES_DESCRIPTION = 'Turns on controller features'
const CONTROLLER_MODE_DESCRIPTION = 'Gamepad is recommended'
const CONTROLLER_MODE_DESKTOP_HINT = 'Switch back to Gamepad'
const CONTROLLER_MODE_UNKNOWN_DESCRIPTION = "Current mode couldn't be read"
const CONTROLLER_MODE_UNAVAILABLE_DESCRIPTION = 'Controller mode is unavailable'
const CONTROLLER_MODE_UNAVAILABLE_OPTION = { data: 'unavailable', label: 'Unavailable' } as const
const HOME_BUTTON_TOGGLE_DESCRIPTION = 'Navigates to Home'
const BRIGHTNESS_DIAL_FIX_DESCRIPTION = 'Controls screen brightness with the right dial'
const INPUTPLUMBER_UNAVAILABLE_DESCRIPTION = 'InputPlumber is not available'
const CONTROLLER_MODE_OPTIONS = [
  { data: 'gamepad', label: 'Gamepad' },
  { data: 'desktop', label: 'Desktop' },
] as const

function getStartupDescription(settings: PluginSettings) {
  if (!settings.inputplumberAvailable) {
    return INPUTPLUMBER_UNAVAILABLE_DESCRIPTION
  }

  return CONTROLLER_FEATURES_DESCRIPTION
}

const ControllerTogglesPanel = ({
  settings,
  savingStartup,
  savingControllerMode,
  savingHomeButton,
  savingBrightnessDialFix,
  onStartupToggleChange,
  onControllerModeChange,
  onHomeButtonToggleChange,
  onBrightnessDialFixToggleChange,
}: Props) => {
  const controllerModeAvailable = settings.controllerModeAvailable
  const controllerModeDescription = !controllerModeAvailable
    ? CONTROLLER_MODE_UNAVAILABLE_DESCRIPTION
    : settings.controllerMode === null
      ? CONTROLLER_MODE_UNKNOWN_DESCRIPTION
      : settings.controllerMode === 'desktop'
        ? CONTROLLER_MODE_DESKTOP_HINT
        : CONTROLLER_MODE_DESCRIPTION
  const controllerModeDropdownProps = {
    label: 'Controller Mode',
    menuLabel: 'Controller Mode',
    rgOptions: controllerModeAvailable ? CONTROLLER_MODE_OPTIONS : [CONTROLLER_MODE_UNAVAILABLE_OPTION],
    selectedOption: controllerModeAvailable ? settings.controllerMode ?? undefined : CONTROLLER_MODE_UNAVAILABLE_OPTION.data,
    strDefaultLabel: controllerModeAvailable ? 'Unknown' : CONTROLLER_MODE_UNAVAILABLE_OPTION.label,
    description: controllerModeDescription,
    disabled: savingControllerMode || !controllerModeAvailable,
    onChange: (option: { data: ControllerMode }) => onControllerModeChange(option.data),
  } as any

  return (
    <>
      <PanelSectionRow>
        <ToggleField
          label="Enable Controller Features"
          checked={settings.startupApplyEnabled}
          onChange={(value: boolean) => onStartupToggleChange(value)}
          disabled={savingStartup || !settings.inputplumberAvailable}
          description={getStartupDescription(settings)}
        />
      </PanelSectionRow>
      {settings.startupApplyEnabled && (
        <>
          <PanelSectionRow>
            <DropdownItem {...controllerModeDropdownProps} />
          </PanelSectionRow>
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
