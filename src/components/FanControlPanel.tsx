import { ButtonItem, Field, Navigation } from '@decky/ui'
import { DECKYZONE_FAN_CURVES_ROUTE } from '../routes'
import FanCurvePreview from './fan/FanCurvePreview'
import ManualFanSpeed from './fan/ManualFanSpeed'
import { fanApi, useFanControl } from './fan/useFanControl'
import { SettingsGroup, SettingsPanel, SettingsRow, useSettingsItemLayout } from './SettingsSurface'
import { SteamExplainerDropdownItem } from './SteamExplainer'

const EXPLAINER = 'System Auto lets your device control the fan. Manual holds a chosen speed. Curve adjusts the speed with temperature. Fan speed stays at or above 10% and reaches 100% at 95°C. If a sensor fails or you enable PowerControl or SimpleDeckyTDP, DeckyZone returns to System Auto. Disable both plugins in Decky settings to use Manual or Curve.'
const MODES = [
  { data: 'auto' as const, label: 'System Auto' },
  { data: 'manual' as const, label: 'Manual' },
  { data: 'curve' as const, label: 'Curve' },
]

export default function FanControlPanel() {
  const itemLayout = useSettingsItemLayout()
  const { state, saving, showProgress, change } = useFanControl()
  const activeCurve = state?.mode === 'curve' ? state.profiles.find(p => p.id === state.selectedProfileId) : undefined
  const unavailable = !state || !state.available || !!state.blockedReason
  const description = showProgress ? 'Applying change…'
    : !state ? 'Checking availability…'
    : state.blockedReason || state.error || (state.suspended ? 'System Auto while asleep'
      : state.mode === 'auto' && state.hardwareMode === 1 ? 'The fan is still set to manual control' : undefined)
  const manageCurves = () => { Navigation.Navigate(DECKYZONE_FAN_CURVES_ROUTE); Navigation.CloseSideMenus() }

  return (
    <SettingsPanel title="Fan control">
      <SettingsGroup>
        <SettingsRow>
          <SteamExplainerDropdownItem label="Mode" layout={itemLayout} explainerTitle="Fan control" explainer={EXPLAINER}
            controlled selectedOption={state?.mode ?? 'auto'} rgOptions={MODES}
            description={description} disabled={saving || !state || (unavailable && state.mode === 'auto')}
            onChange={option => {
              if (option.data === 'curve' && !state?.profiles.length) { manageCurves(); return }
              void change(latest => fanApi.mode(option.data, latest.revision), {
                mode: option.data,
                selectedProfileId: state?.selectedProfileId ?? (option.data === 'curve' ? state?.profiles[0]?.id ?? null : null),
              }).catch(() => {})
            }} />
        </SettingsRow>
        {state?.mode === 'manual' && <SettingsRow>
          <ManualFanSpeed value={state.manualSpeed} busy={saving} disabled={unavailable || state.suspended}
            onChange={async speed => {
              const next = await change(latest => fanApi.manualSpeed(speed, latest.revision), { manualSpeed: speed }, 'silent')
              if (next.mode !== 'manual' || next.blockedReason) throw new Error('Manual fan control stopped')
            }} />
        </SettingsRow>}
        {state?.mode === 'curve' && <SettingsRow>
          <SteamExplainerDropdownItem label="Curve" layout={itemLayout} controlled selectedOption={state.selectedProfileId ?? undefined}
            rgOptions={state.profiles.map(p => ({ data: p.id, label: p.name }))} disabled={saving || unavailable}
            onChange={option => { void change(latest => fanApi.select(option.data, latest.revision), { selectedProfileId: option.data }).catch(() => {}) }} />
        </SettingsRow>}
        {state?.active && !state.suspended && !state.blockedReason && activeCurve && <SettingsRow>
          <Field focusable childrenLayout="below" padding="none">
            <FanCurvePreview name={activeCurve.name} curve={activeCurve.curve}
              temperature={state.temperature} dutyPercent={state.dutyPercent} />
          </Field>
        </SettingsRow>}
        {state?.mode === 'auto' && state.hardwareMode === 1 && !state.blockedReason && <SettingsRow>
          <ButtonItem label="Manual fan control" layout={itemLayout} disabled={saving}
            onClick={() => { void change(latest => fanApi.mode('auto', latest.revision)).catch(() => {}) }}>Restore System Auto</ButtonItem>
        </SettingsRow>}
        {state?.available && <>
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
        </>}
        <SettingsRow>
          <ButtonItem layout={itemLayout} disabled={saving} onClick={manageCurves}>Manage curves</ButtonItem>
        </SettingsRow>
      </SettingsGroup>
    </SettingsPanel>
  )
}
