import type { PluginSettingsUpdate } from '../../state/DeckyZoneState'
import type { PluginSettings } from '../../types/plugin'
import SettingsDialogBodyText from '../SettingsDialogBodyText'
import { SettingsSurfaceProvider } from '../SettingsSurface'
import { XboxControllerSetting } from './PerGameSettingsPanel'
import RumblePanel from './RumblePanel'
import useGameControllerSettings from './useGameControllerSettings'

type Props = {
  appId: string
  settings: PluginSettings
  onSettingsChange: (update: PluginSettingsUpdate) => void
  gameName?: string
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}

export default function GameControllerGeneral(props: Props) {
  const controls = useGameControllerSettings(props)
  const profile = props.appId === '0' ? undefined : props.settings.perGameSettings[props.appId]

  return (
    <SettingsSurfaceProvider surface="settings">
      {profile && !profile.enabled && (
        <SettingsDialogBodyText>
          These game settings are disabled. Changing a setting enables them for this game.
        </SettingsDialogBodyText>
      )}
      <RumblePanel
        inputplumberAvailable={props.settings.inputplumberAvailable}
        rumbleAvailable={props.settings.rumbleAvailable}
        rumbleEnabled={controls.rumbleEnabled}
        rumbleIntensityDraft={controls.rumbleIntensity}
        savingRumble={controls.controlsDisabled}
        savingRumbleIntensity={controls.saving}
        testingRumble={controls.testingRumble}
        onRumbleToggleChange={controls.setRumbleEnabled}
        onRumbleIntensityChange={controls.setRumbleIntensity}
        onTestRumble={controls.testRumble}
      />
      {props.appId !== '0' && (
        <XboxControllerSetting
          inputplumberAvailable={props.settings.inputplumberAvailable}
          checked={controls.isButtonPromptFixEnabled}
          disabled={controls.controlsDisabled}
          onChange={controls.setButtonPromptFixEnabled}
        />
      )}
    </SettingsSurfaceProvider>
  )
}
