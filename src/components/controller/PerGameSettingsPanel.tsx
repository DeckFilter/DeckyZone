import { PanelSectionRow } from '@decky/ui'
import type { ActiveGame } from '../../types/plugin'
import { SteamExplainerToggleField } from '../SteamExplainer'

type Props = {
  activeGame: ActiveGame | null
  inputplumberAvailable: boolean
  isPerGameSettingsEnabled: boolean
  isButtonPromptFixEnabled: boolean
  savingPerGameSettings: boolean
  savingButtonPromptFix: boolean
  onPerGameSettingsToggleChange: (enabled: boolean) => void
  onButtonPromptFixToggleChange: (enabled: boolean) => void
}

const INPUTPLUMBER_UNAVAILABLE_MESSAGE = 'InputPlumber is not available'
const NO_ACTIVE_GAME_PER_GAME_SETTINGS_MESSAGE = 'Launch a game to enable per-game settings'
const PER_GAME_SETTINGS_EXPLAINER =
  'Stores separate button prompt, trackpad, and rumble settings for the running game. Other games keep using the global settings.'
const BUTTON_PROMPT_FIX_EXPLAINER =
  "Switches the running game's virtual controller to Xbox Elite so Steam uses compatible button prompts and glyphs."
// TODO: Re-enable these remap options after M1/M2 remap behavior is fully confirmed on-device.
// const M1_REMAP_DESCRIPTION = 'Maps M1 while this fix is on'
// const M2_REMAP_DESCRIPTION = 'Maps M2 while this fix is on'
// const PER_GAME_REMAP_OPTIONS = [
//   { data: 'none', label: 'None' },
//   { data: 'a', label: 'A' },
//   { data: 'b', label: 'B' },
//   { data: 'x', label: 'X' },
//   { data: 'y', label: 'Y' },
//   { data: 'select', label: 'View / Select' },
//   { data: 'start', label: 'Menu / Start' },
//   { data: 'lb', label: 'LB' },
//   { data: 'rb', label: 'RB' },
//   { data: 'lt', label: 'LT' },
//   { data: 'rt', label: 'RT' },
//   { data: 'ls', label: 'LS' },
//   { data: 'rs', label: 'RS' },
//   { data: 'dpad_up', label: 'D-Pad Up' },
//   { data: 'dpad_down', label: 'D-Pad Down' },
//   { data: 'dpad_left', label: 'D-Pad Left' },
//   { data: 'dpad_right', label: 'D-Pad Right' },
// ] as const

function getPerGameSettingsExplainer(activeGame: ActiveGame | null, inputplumberAvailable: boolean) {
  if (!inputplumberAvailable) {
    return `${PER_GAME_SETTINGS_EXPLAINER} ${INPUTPLUMBER_UNAVAILABLE_MESSAGE}.`
  }

  if (!activeGame) {
    return `${PER_GAME_SETTINGS_EXPLAINER} ${NO_ACTIVE_GAME_PER_GAME_SETTINGS_MESSAGE}.`
  }

  return `${PER_GAME_SETTINGS_EXPLAINER} Current game: ${activeGame.display_name}.`
}

function getButtonPromptFixExplainer(inputplumberAvailable: boolean) {
  return inputplumberAvailable
    ? BUTTON_PROMPT_FIX_EXPLAINER
    : `${BUTTON_PROMPT_FIX_EXPLAINER} ${INPUTPLUMBER_UNAVAILABLE_MESSAGE}.`
}

const PerGameSettingsPanel = ({
  activeGame,
  inputplumberAvailable,
  isPerGameSettingsEnabled,
  isButtonPromptFixEnabled,
  savingPerGameSettings,
  savingButtonPromptFix,
  onPerGameSettingsToggleChange,
  onButtonPromptFixToggleChange,
}: Props) => {
  // TODO: Re-enable these locals after M1/M2 remap behavior is fully confirmed on-device.
  // const remapDropdownDisabled =
  //   savingPerGameSettings || savingButtonPromptFix || savingPerGameTrackpads || savingPerGameRemaps || !inputplumberAvailable
  // const m1RemapDropdownProps = {
  //   label: 'M1 Remap',
  //   menuLabel: 'M1 Remap',
  //   rgOptions: PER_GAME_REMAP_OPTIONS,
  //   selectedOption: m1RemapTarget,
  //   strDefaultLabel: 'None',
  //   description: M1_REMAP_DESCRIPTION,
  //   disabled: remapDropdownDisabled,
  //   onChange: (option: { data: PerGameRemapTarget }) => onPerGameM1RemapTargetChange(option.data),
  // } as any
  // const m2RemapDropdownProps = {
  //   label: 'M2 Remap',
  //   menuLabel: 'M2 Remap',
  //   rgOptions: PER_GAME_REMAP_OPTIONS,
  //   selectedOption: m2RemapTarget,
  //   strDefaultLabel: 'None',
  //   description: M2_REMAP_DESCRIPTION,
  //   disabled: remapDropdownDisabled,
  //   onChange: (option: { data: PerGameRemapTarget }) => onPerGameM2RemapTargetChange(option.data),
  // } as any

  return (
    <>
      <PanelSectionRow>
        <SteamExplainerToggleField
          label="Enable Per-Game Settings"
          explainerTitle="Per-Game Settings"
          explainer={getPerGameSettingsExplainer(activeGame, inputplumberAvailable)}
          checked={isPerGameSettingsEnabled}
          onChange={(value: boolean) => onPerGameSettingsToggleChange(value)}
          disabled={!activeGame || savingPerGameSettings || !inputplumberAvailable}
        />
      </PanelSectionRow>
      {activeGame && isPerGameSettingsEnabled && (
        <PanelSectionRow>
          <SteamExplainerToggleField
            label="Button Prompt Fix"
            explainerTitle="Button Prompt Fix"
            explainer={getButtonPromptFixExplainer(inputplumberAvailable)}
            checked={isButtonPromptFixEnabled}
            onChange={(value: boolean) => onButtonPromptFixToggleChange(value)}
            disabled={savingPerGameSettings || savingButtonPromptFix || !inputplumberAvailable}
          />
        </PanelSectionRow>
      )}
    </>
  )
}

export default PerGameSettingsPanel
