import { ButtonItem } from '@decky/ui'
import { SettingsRow, useSettingsItemLayout } from '../SettingsSurface'
import { SteamExplainerSliderField, SteamExplainerToggleField } from '../SteamExplainer'

type Props = {
  inputplumberAvailable: boolean
  rumbleEnabled: boolean
  rumbleAvailable: boolean
  savingRumble: boolean
  savingRumbleIntensity: boolean
  testingRumble: boolean
  rumbleIntensityDraft: number
  onRumbleToggleChange: (enabled: boolean) => void
  onRumbleIntensityChange: (value: number) => void
  onTestRumble: () => void
}

const RUMBLE_EXPLAINER =
  'Enables controller vibration. Use Intensity below to adjust its strength and Test Rumble to preview it.'
const RUMBLE_INTENSITY_EXPLAINER = 'Adjusts vibration strength. 75% is recommended; 100% is very strong.'
const RUMBLE_UNAVAILABLE_MESSAGE = 'Rumble device is not available'

function getRumbleExplainer(rumbleAvailable: boolean) {
  return rumbleAvailable ? RUMBLE_EXPLAINER : `${RUMBLE_EXPLAINER} ${RUMBLE_UNAVAILABLE_MESSAGE}.`
}

const RumblePanel = ({
  inputplumberAvailable,
  rumbleEnabled,
  rumbleAvailable,
  savingRumble,
  savingRumbleIntensity,
  testingRumble,
  rumbleIntensityDraft,
  onRumbleToggleChange,
  onRumbleIntensityChange,
  onTestRumble,
}: Props) => {
  const itemLayout = useSettingsItemLayout()

  return (
    <>
      <SettingsRow>
        <SteamExplainerToggleField
          label="Rumble Controls"
          explainerTitle="Rumble Controls"
          explainer={getRumbleExplainer(rumbleAvailable)}
          settingsDescription={rumbleAvailable ? 'Enables controller vibration' : RUMBLE_UNAVAILABLE_MESSAGE}
          checked={rumbleEnabled}
          onChange={(value: boolean) => onRumbleToggleChange(value)}
          disabled={savingRumble}
        />
      </SettingsRow>
      {rumbleEnabled && (
        <>
          <SettingsRow>
            <SteamExplainerSliderField
              label="Intensity"
              explainerTitle="Rumble Intensity"
              explainer={RUMBLE_INTENSITY_EXPLAINER}
              settingsDescription="Sets vibration strength"
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
          </SettingsRow>
          <SettingsRow>
            <ButtonItem
              layout={itemLayout}
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
          </SettingsRow>
        </>
      )}
    </>
  )
}

export default RumblePanel
