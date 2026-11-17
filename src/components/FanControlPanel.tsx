import { ButtonItem, Field } from '@decky/ui'
import { useState } from 'react'
import CustomFanCurve from './fan/CustomFanCurve'
import FanCurvePreview from './fan/FanCurvePreview'
import ManualFanSpeed from './fan/ManualFanSpeed'
import { fanApi, useFanControl } from './fan/useFanControl'
import { SettingsGroup, SettingsPanel, SettingsRow, useSettingsItemLayout, useSettingsSurface } from './SettingsSurface'
import { SteamExplainerDropdownItem } from './SteamExplainer'

const EXPLAINER = 'System Auto lets your device control the fan. Manual holds a chosen speed. Curve adjusts the speed with temperature. Fan speed stays at or above 10% and reaches 100% at 95°C. If a sensor fails or you enable PowerControl or SimpleDeckyTDP, DeckyZone returns to System Auto. Disable both plugins in Decky settings to use Manual or Curve.'
const MODES = [
  { data: 'auto' as const, label: 'System Auto' },
  { data: 'manual' as const, label: 'Manual' },
  { data: 'custom' as const, label: 'Curve' },
]

export default function FanControlPanel() {
  const itemLayout = useSettingsItemLayout()
  const surface = useSettingsSurface()
  const [dialogOpen, setDialogOpen] = useState(false)
  const { state, saving, showProgress, change } = useFanControl()
  const busy = saving || dialogOpen
  const unavailable = !state || !state.available || !!state.blockedReason
  const description = showProgress ? 'Applying change…'
    : !state ? 'Checking availability…'
    : state.blockedReason || state.error || (state.suspended ? 'System Auto while asleep'
      : state.mode === 'auto' && state.hardwareMode === 1 ? 'The fan is still set to manual control' : undefined)

  return (
    <SettingsPanel title="Fan control">
      <SettingsGroup>
        <SettingsRow>
          <SteamExplainerDropdownItem label="Mode" layout={itemLayout} explainerTitle="Fan control" explainer={EXPLAINER}
            controlled selectedOption={state?.mode ?? 'auto'} rgOptions={MODES}
            description={description} disabled={busy || !state || (unavailable && state.mode === 'auto')}
            onChange={option => {
              void change(latest => fanApi.mode(option.data, latest.revision), { mode: option.data }).catch(() => {})
            }} />
        </SettingsRow>
        {state?.mode === 'manual' && <SettingsRow>
          <ManualFanSpeed value={state.manualSpeed} busy={busy} disabled={unavailable || state.suspended}
            onChange={async speed => {
              const next = await change(latest => fanApi.manualSpeed(speed, latest.revision), { manualSpeed: speed }, 'silent')
              if (next.mode !== 'manual' || next.blockedReason) throw new Error('Manual fan control stopped')
            }} />
        </SettingsRow>}
        {surface === 'quick-access' && state?.mode === 'custom' && state.active && !state.suspended && !state.blockedReason && <SettingsRow>
          <Field focusable childrenLayout="below" padding="none">
            <FanCurvePreview name="Curve" curve={state.curve}
              temperature={state.temperature} dutyPercent={state.dutyPercent} />
          </Field>
        </SettingsRow>}
        {state?.mode === 'auto' && state.hardwareMode === 1 && !state.blockedReason && <SettingsRow>
          <ButtonItem label="Manual fan control" layout={itemLayout} disabled={busy}
            onClick={() => { void change(latest => fanApi.mode('auto', latest.revision)).catch(() => {}) }}>Restore System Auto</ButtonItem>
        </SettingsRow>}
        {surface === 'settings' && <CustomFanCurve state={state}
          busy={busy || unavailable || !!state?.suspended} change={change} onDialogChange={setDialogOpen} />}
      </SettingsGroup>
      {state?.available && <SettingsGroup>
        <SettingsRow>
          <Field focusable label="Fan speed" childrenLayout="inline" inlineWrap="keep-inline">
            {state.rpm === null ? 'Unavailable' : `${state.rpm} RPM`}
          </Field>
        </SettingsRow>
        <SettingsRow>
          <Field focusable label="Temperature" childrenLayout="inline" inlineWrap="keep-inline">
            {state.temperature === null ? 'Unavailable' : `${state.temperature.toFixed(1)}°C`}
          </Field>
        </SettingsRow>
      </SettingsGroup>}
    </SettingsPanel>
  )
}
