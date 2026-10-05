import { callable } from '@decky/api'
import { ButtonItem, DialogButton, Field, Focusable, Navigation, TextField, showModal } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import { DECKYZONE_FAN_CONTROL_ROUTE } from '../routes'
import type { FanControlResult, FanControlState, FanPoint, FanProfile, PowerControlFanProfile } from '../types/plugin'
import { useDeckyToastNotice } from '../utils/toasts'
import FanCurveEditor from './fan/FanCurveEditor'
import FanCurvePreview from './fan/FanCurvePreview'
import FanImportDialog from './fan/FanImportDialog'
import { SettingsGroup, SettingsPanel, SettingsRow, useSettingsItemLayout, useSettingsSurface } from './SettingsSurface'
import { SteamExplainerDropdownItem } from './SteamExplainer'

const getStatus = callable<[], FanControlState>('get_fan_control_status')
const selectProfile = callable<[string | null, number], FanControlResult>('select_fan_profile')
const saveProfile = callable<[string | null, string, FanPoint[], number], FanControlResult>('save_fan_profile')
const duplicateProfile = callable<[string, number], FanControlResult>('duplicate_fan_profile')
const deleteProfile = callable<[string, number], FanControlResult>('delete_fan_profile')
const getImports = callable<[], PowerControlFanProfile[]>('get_powercontrol_fan_profiles')
const importCurves = callable<[PowerControlFanProfile[], number], FanControlResult>('import_powercontrol_fan_curves')
const EXPLAINER = 'System Auto lets your device control the fan. Choose a saved curve to use it in all games. You can edit other curves without activating them. Fan speed stays at or above 10% and reaches 100% at 95°C. If a sensor fails or you enable PowerControl or SimpleDeckyTDP, DeckyZone returns to System Auto. Disable both plugins in Decky settings to use a custom curve.'
const actionStyle = { minWidth: 0, padding: '6px 12px' }
type Draft = { id: string | null; name: string; curve: FanPoint[]; revision: number }

export default function FanControlPanel() {
  const surface = useSettingsSurface()
  const itemLayout = useSettingsItemLayout()
  const [state, setState] = useState<FanControlState | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string; revision: number } | null>(null)
  const [importing, setImporting] = useState(false)
  const inFlight = useRef(false)
  const reading = useRef(false)
  const generation = useRef(0)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    const refresh = async () => {
      if (inFlight.current || reading.current) return
      reading.current = true
      const request = ++generation.current
      try {
        const next = await getStatus()
        if (mounted.current && request === generation.current) setState(next)
      } catch {
        if (mounted.current && request === generation.current) {
          setState(null); setNotice("Couldn't read fan control status")
        }
      } finally { reading.current = false }
    }
    void refresh()
    const timer = setInterval(() => void refresh(), 2000)
    return () => { mounted.current = false; generation.current++; clearInterval(timer) }
  }, [])

  useDeckyToastNotice(notice ? { activeKey: `fan-control:${notice}`, title: 'Fan control', body: notice, severity: 'error' } : null)

  const change = async (operation: () => Promise<FanControlResult>) => {
    if (inFlight.current) throw new Error('A fan setting is already being applied')
    inFlight.current = true; generation.current++; setSaving(true); setNotice(null)
    try {
      const result = await operation()
      if (!result.ok) throw new Error(result.error)
      if (mounted.current) setState(result.state)
    } catch (error) {
      try {
        const next = await getStatus()
        if (mounted.current) setState(next)
      } catch { if (mounted.current) setState(null) }
      if (mounted.current) setNotice(error instanceof Error ? error.message : "Couldn't update fan control")
      throw error
    } finally {
      inFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }

  const openImport = async () => {
    if (!state || inFlight.current) return
    inFlight.current = true; generation.current++; setSaving(true); setNotice(null)
    try {
      const [available, next] = await Promise.all([getImports(), getStatus()])
      if (!mounted.current) return
      setState(next); setImporting(true)
      showModal(<FanImportDialog profiles={available}
        onImport={() => change(() => importCurves(available, next.revision))}
        onClose={() => { if (mounted.current) setImporting(false) }} />)
    } catch { if (mounted.current) setNotice("Couldn't read PowerControl's saved fan curves") }
    finally { inFlight.current = false; if (mounted.current) setSaving(false) }
  }

  const openEditor = (profile?: FanProfile) => {
    if (!state || inFlight.current) return
    setNotice(null)
    setEditing({ id: profile?.id ?? null, name: profile?.name ?? '',
      curve: profile?.curve ?? state.defaultCurve, revision: state.revision })
  }
  const activeId = state?.mode === 'custom' ? state.selectedProfileId : null
  const activeProfile = state?.profiles.find(p => p.id === activeId)
  const description = saving ? 'Applying change…'
    : !state ? 'Checking availability…'
    : editing ? 'Save or cancel your edits first'
    : importing ? 'Close the import dialog to change profiles'
    : deleting ? 'Confirm or cancel deletion first'
    : state.blockedReason || state.error || (state.suspended ? 'System Auto while asleep' : state.active ? undefined : state.hardwareMode === 1 ? 'The fan is still set to manual control' : 'Your device controls the fan')
  const unavailable = !state || !state.available || !!state.blockedReason
  const busy = saving || !!editing || importing || !!deleting
  const atLimit = !!state && state.profiles.length >= state.maxProfiles
  const editsActive = !!editing?.id && editing.id === activeId

  return (
    <SettingsPanel title="Fan control">
      <SettingsGroup>
        <SettingsRow>
          <SteamExplainerDropdownItem label="Active profile" layout={itemLayout} explainerTitle="Fan control" explainer={EXPLAINER}
            controlled selectedOption={activeId ?? 'auto'}
            rgOptions={[{ data: 'auto', label: 'System Auto' }, ...(state?.profiles ?? []).map(p => ({ data: p.id, label: p.name }))]}
            description={description} disabled={busy || !state || (unavailable && state.mode === 'auto')}
            onChange={option => { if (state) void change(() => selectProfile(option.data === 'auto' ? null : option.data, state.revision)).catch(() => {}) }} />
        </SettingsRow>
        {surface === 'quick-access' && state?.active && !state.suspended && !state.blockedReason && activeProfile && <SettingsRow>
          <FanCurvePreview name={activeProfile.name} curve={activeProfile.curve}
            temperature={state.temperature} dutyPercent={state.dutyPercent} />
        </SettingsRow>}
        {state?.mode === 'auto' && state.hardwareMode === 1 && !state.blockedReason && <SettingsRow>
          <ButtonItem label="Manual fan control" layout={itemLayout} disabled={busy}
            onClick={() => { void change(() => selectProfile(null, state.revision)).catch(() => {}) }}>Restore System Auto</ButtonItem>
        </SettingsRow>}
        {state?.available && <>
          <SettingsRow>
            <Field label="Fan speed" childrenLayout={itemLayout}>
              {state.rpm === null ? 'Unavailable' : `${state.rpm} RPM`}
            </Field>
          </SettingsRow>
          <SettingsRow>
            <Field label="Temperature" childrenLayout={itemLayout}>
              {state.temperature === null ? 'Unavailable' : `${state.temperature.toFixed(1)}°C`}
            </Field>
          </SettingsRow>
        </>}
        {surface === 'quick-access' && <SettingsRow>
          <ButtonItem layout="below" onClick={() => { Navigation.Navigate(DECKYZONE_FAN_CONTROL_ROUTE); Navigation.CloseSideMenus() }}>Manage custom curves</ButtonItem>
        </SettingsRow>}
      </SettingsGroup>
      {surface === 'settings' && <SettingsGroup title="Custom curves">
        {editing ? <>
          <TextField label="Curve name" value={editing.name} disabled={saving}
            description={editsActive ? 'Saving updates the active curve' : 'Saving leaves the active profile unchanged'}
            onChange={event => setEditing({ ...editing, name: event.target.value })} />
          <FanCurveEditor key={editing.id ?? 'new'} curve={editing.curve} disabled={saving}
            saveLabel={editsActive ? 'Save and apply' : 'Save curve'}
            onSave={async curve => {
              await change(() => saveProfile(editing.id, editing.name, curve, editing.revision))
              if (mounted.current) setEditing(null)
            }} onCancel={() => setEditing(null)} />
        </> : <>
          {state && !state.profiles.length && <Field label="No curves yet" description="Add a curve or import one from PowerControl" />}
          {state?.profiles.map(profile => <SettingsRow key={profile.id}>
            <Field label={profile.name} description={profile.id === activeId ? 'Active' : undefined}>
              <Focusable style={{ display: 'flex', gap: '8px', width: '320px', maxWidth: '100%' }}>
                <DialogButton style={actionStyle} disabled={busy} aria-label={`Edit ${profile.name}`} onClick={() => openEditor(profile)}>Edit</DialogButton>
                <DialogButton style={actionStyle} disabled={busy || atLimit} aria-label={`Duplicate ${profile.name}`}
                  onClick={() => { void change(() => duplicateProfile(profile.id, state.revision)).catch(() => {}) }}>Duplicate</DialogButton>
                <DialogButton style={actionStyle} disabled={busy} aria-label={`Delete ${profile.name}`}
                  onClick={() => setDeleting({ id: profile.id, name: profile.name, revision: state.revision })}>Delete</DialogButton>
              </Focusable>
            </Field>
          </SettingsRow>)}
          {atLimit && <Field label="Saved curve limit reached" description={`Delete a curve before adding another (maximum ${state?.maxProfiles})`} />}
          <SettingsRow>
            <ButtonItem label="New curve" layout="inline" disabled={!state || busy || atLimit}
              onClick={() => openEditor()}>Add</ButtonItem>
          </SettingsRow>
          <SettingsRow>
            <ButtonItem label="Import from PowerControl" layout="inline" disabled={!state || busy || atLimit}
              onClick={() => void openImport()}>Import</ButtonItem>
          </SettingsRow>
        </>}
        {deleting && <>
          <Field label={`Delete “${deleting.name}”?`} />
          <Focusable style={{ display: 'flex', gap: '8px' }}>
            <DialogButton disabled={saving} onClick={() => {
              void change(() => deleteProfile(deleting.id, deleting.revision)).then(() => {
                if (mounted.current) setDeleting(null)
              }).catch(() => {})
            }}>Delete curve</DialogButton>
            <DialogButton disabled={saving} onClick={() => setDeleting(null)}>Cancel</DialogButton>
          </Focusable>
        </>}
      </SettingsGroup>}
    </SettingsPanel>
  )
}
