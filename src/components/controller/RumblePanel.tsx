import { ButtonItem, DropdownItem, PanelSectionRow, SliderField, ToggleField } from '@decky/ui'
import type { TrackpadMode } from '../../types/plugin'

type Props = {
  inputplumberAvailable: boolean
  controllerModeBlocked: boolean
  rumbleEnabled: boolean
  rumbleAvailable: boolean
  savingRumble: boolean
  savingRumbleIntensity: boolean
  testingRumble: boolean
  savingTrackpads: boolean
  rumbleIntensityDraft: number
  trackpadMode: TrackpadMode
  onRumbleToggleChange: (enabled: boolean) => void
  onRumbleIntensityChange: (value: number) => void
  onTestRumble: () => void
  onTrackpadModeChange: (mode: TrackpadMode) => void
}
type TrackpadModeOption = { data: TrackpadMode; label: string }

const DEFAULT_RUMBLE_DESCRIPTION = 'Change and test vibration intensity'
const RUMBLE_INTENSITY_DESCRIPTION = '75% recommended, 100% is very strong'
const RUMBLE_UNAVAILABLE_MESSAGE = 'Rumble device is not available'
const INPUTPLUMBER_UNAVAILABLE_DESCRIPTION = 'InputPlumber is not available'
const NO_GAMEPAD_MODE_DESCRIPTION = 'No Gamepad mode detected'
const TRACKPAD_MODE_OPTIONS: TrackpadModeOption[] = [
  { data: 'mouse', label: 'Mouse' },
  { data: 'disabled', label: 'Disabled' },
  { data: 'directional_buttons', label: 'Directional Buttons' },
]

function getRumbleDescription(rumbleAvailable: boolean) {
  if (!rumbleAvailable) {
    return RUMBLE_UNAVAILABLE_MESSAGE
  }

  return DEFAULT_RUMBLE_DESCRIPTION
}

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
function getTrackpadDescription(inputplumberAvailable: boolean, controllerModeBlocked: boolean, mode: TrackpadMode) {
  if (!inputplumberAvailable) {
    return INPUTPLUMBER_UNAVAILABLE_DESCRIPTION
  }

  if (controllerModeBlocked) {
    return NO_GAMEPAD_MODE_DESCRIPTION
  }

  return getTrackpadModeDescription(mode)
}

const RumblePanel = ({
  inputplumberAvailable,
  controllerModeBlocked,
  rumbleEnabled,
  rumbleAvailable,
  savingRumble,
  savingRumbleIntensity,
  testingRumble,
  savingTrackpads,
  rumbleIntensityDraft,
  trackpadMode,
  onRumbleToggleChange,
  onRumbleIntensityChange,
  onTestRumble,
  onTrackpadModeChange,
}: Props) => {
  return (
    <>
      <PanelSectionRow>
        <ToggleField
          label="Rumble Controls"
          checked={rumbleEnabled}
          onChange={(value: boolean) => onRumbleToggleChange(value)}
          disabled={savingRumble}
          description={getRumbleDescription(rumbleAvailable)}
        />
      </PanelSectionRow>
      {rumbleEnabled && (
        <>
          <PanelSectionRow>
            <SliderField
              label="Intensity"
              description={RUMBLE_INTENSITY_DESCRIPTION}
              value={rumbleIntensityDraft}
              min={0}
              max={100}
              step={5}
              notchTicksVisible
              showValue
              resetValue={75}
              onChange={onRumbleIntensityChange}
              disabled={savingRumble || savingRumbleIntensity || !rumbleEnabled || !rumbleAvailable}
            />
          </PanelSectionRow>
          <PanelSectionRow>
            <ButtonItem
              layout="below"
              onClick={() => onTestRumble()}
              disabled={
                savingRumble ||
                savingRumbleIntensity ||
                testingRumble ||
                !rumbleEnabled ||
                !rumbleAvailable ||
                !inputplumberAvailable
              }
            >
              {testingRumble ? 'Testing Rumble...' : 'Test Rumble'}
            </ButtonItem>
          </PanelSectionRow>
        </>
      )}
      <PanelSectionRow>
        <DropdownItem
          label="Trackpad Mode"
          menuLabel="Trackpad Mode"
          rgOptions={TRACKPAD_MODE_OPTIONS}
          selectedOption={trackpadMode}
          disabled={savingTrackpads || !inputplumberAvailable || controllerModeBlocked}
          description={getTrackpadDescription(inputplumberAvailable, controllerModeBlocked, trackpadMode)}
          onChange={(option: { data: TrackpadMode }) => onTrackpadModeChange(option.data)}
        />
      </PanelSectionRow>
    </>
  )
}

export default RumblePanel
