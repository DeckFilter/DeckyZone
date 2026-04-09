import { ButtonItem, gamepadDialogClasses, PanelSectionRow, SliderField, ToggleField } from '@decky/ui'
import type { PluginSettings } from '../../types/plugin'

type Props = {
  settings: PluginSettings
  savingRumble: boolean
  savingRumbleIntensity: boolean
  testingRumble: boolean
  rumbleIntensityDraft: number
  rumbleMessage: string | null
  rumbleMessageKind: 'success' | 'error' | null
  onRumbleToggleChange: (enabled: boolean) => void
  onRumbleIntensityChange: (value: number) => void
  onTestRumble: () => void
}

const DEFAULT_RUMBLE_DESCRIPTION = 'Change and test vibration intensity'
const RUMBLE_INTENSITY_DESCRIPTION = '75% recommended, 100% is very strong'
const RUMBLE_UNAVAILABLE_MESSAGE = 'Rumble device is not available'

function getRumbleDescription(settings: PluginSettings) {
  if (!settings.rumbleAvailable) {
    return RUMBLE_UNAVAILABLE_MESSAGE
  }

  return DEFAULT_RUMBLE_DESCRIPTION
}

const RumblePanel = ({
  settings,
  savingRumble,
  savingRumbleIntensity,
  testingRumble,
  rumbleIntensityDraft,
  rumbleMessage,
  rumbleMessageKind,
  onRumbleToggleChange,
  onRumbleIntensityChange,
  onTestRumble,
}: Props) => {
  return (
    <>
      <PanelSectionRow>
        <ToggleField
          label="Vibration / Rumble"
          checked={settings.rumbleEnabled}
          onChange={(value: boolean) => onRumbleToggleChange(value)}
          disabled={savingRumble}
          description={getRumbleDescription(settings)}
        />
      </PanelSectionRow>
      {settings.rumbleEnabled && (
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
              disabled={savingRumble || savingRumbleIntensity || !settings.rumbleEnabled || !settings.rumbleAvailable}
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
                !settings.rumbleEnabled ||
                !settings.rumbleAvailable ||
                !settings.inputplumberAvailable
              }
            >
              {testingRumble ? 'Testing Rumble...' : 'Test Rumble'}
            </ButtonItem>
          </PanelSectionRow>
          {rumbleMessage && (
            <PanelSectionRow>
              <div
                className={gamepadDialogClasses.FieldDescription}
                style={{
                  color: rumbleMessageKind === 'error' ? 'red' : undefined,
                }}
              >
                {rumbleMessage}
              </div>
            </PanelSectionRow>
          )}
        </>
      )}
    </>
  )
}

export default RumblePanel
