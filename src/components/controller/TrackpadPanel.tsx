import { useEffect, useState } from 'react'
import type { TrackpadMode } from '../../types/plugin'
import { SettingsRow } from '../SettingsSurface'
import { SteamExplainerDropdownItem } from '../SteamExplainer'

type Props = {
  inputplumberAvailable: boolean
  controllerModeBlocked: boolean
  savingTrackpads: boolean
  trackpadMode: TrackpadMode
  onTrackpadModeChange: (mode: TrackpadMode) => void
}

type TrackpadModeOption = { data: TrackpadMode; label: string }

const INPUTPLUMBER_UNAVAILABLE_MESSAGE = 'InputPlumber is not available'
const NO_GAMEPAD_MODE_MESSAGE = 'No Gamepad mode detected'
const TRACKPAD_MODE_EXPLAINER =
  'Default keeps normal controller behavior with mouse input. Disabled turns off both trackpads. Directional Buttons uses the left pad as a D-pad and the right pad as A/B/X/Y.'
const TRACKPAD_MODE_OPTIONS: TrackpadModeOption[] = [
  { data: 'default', label: 'Default' },
  { data: 'disabled', label: 'Disabled' },
  { data: 'directional_buttons', label: 'Directional Buttons' },
]

function getTrackpadExplainer(inputplumberAvailable: boolean, controllerModeBlocked: boolean) {
  if (!inputplumberAvailable) {
    return `${TRACKPAD_MODE_EXPLAINER} ${INPUTPLUMBER_UNAVAILABLE_MESSAGE}.`
  }

  if (controllerModeBlocked) {
    return `${TRACKPAD_MODE_EXPLAINER} ${NO_GAMEPAD_MODE_MESSAGE}.`
  }

  return TRACKPAD_MODE_EXPLAINER
}

function getTrackpadDescription(inputplumberAvailable: boolean, controllerModeBlocked: boolean) {
  if (!inputplumberAvailable) {
    return INPUTPLUMBER_UNAVAILABLE_MESSAGE
  }

  if (controllerModeBlocked) {
    return NO_GAMEPAD_MODE_MESSAGE
  }

  return 'Configures both trackpads'
}

const TrackpadPanel = ({
  inputplumberAvailable,
  controllerModeBlocked,
  savingTrackpads,
  trackpadMode,
  onTrackpadModeChange,
}: Props) => {
  const [trackpadModeValue, setTrackpadModeValue] = useState(trackpadMode)

  useEffect(() => {
    setTrackpadModeValue(trackpadMode)
  }, [trackpadMode])

  const selectedTrackpadOption = TRACKPAD_MODE_OPTIONS.find((option) => option.data === trackpadModeValue)

  return (
    <SettingsRow>
      <SteamExplainerDropdownItem
        controlled
        layout="below"
        label="Trackpad Mode"
        menuLabel="Trackpad Mode"
        explainerTitle="Trackpad Mode"
        explainer={getTrackpadExplainer(inputplumberAvailable, controllerModeBlocked)}
        settingsDescription={getTrackpadDescription(inputplumberAvailable, controllerModeBlocked)}
        rgOptions={TRACKPAD_MODE_OPTIONS}
        strDefaultLabel={selectedTrackpadOption?.label ?? 'Default'}
        selectedOption={selectedTrackpadOption?.data ?? trackpadModeValue}
        disabled={savingTrackpads || !inputplumberAvailable || controllerModeBlocked}
        onChange={(option: { data: TrackpadMode }) => {
          setTrackpadModeValue(option.data)
          onTrackpadModeChange(option.data)
        }}
      />
    </SettingsRow>
  )
}

export default TrackpadPanel
