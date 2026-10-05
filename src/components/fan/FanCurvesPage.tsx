import { ButtonItem, DialogBody, Field, Navigation, SidebarNavigation, SteamSpinner, TextField, showModal } from '@decky/ui'
import { useState } from 'react'
import { FiDownload, FiPlus, FiTrendingUp } from 'react-icons/fi'
import { MappingGamePage as SettingsPage } from '../../controllerMapping/nativeUi'
import { DECKYZONE_FAN_CURVES_ROUTE } from '../../routes'
import type { FanControlState, FanPoint, FanProfile, PowerControlFanProfile } from '../../types/plugin'
import { SettingsGroup } from '../SettingsSurface'
import FanCurveEditor from './FanCurveEditor'
import FanDeleteDialog from './FanDeleteDialog'
import FanImportDialog from './FanImportDialog'
import { fanApi, useFanControl } from './useFanControl'

type Draft = { name: string; curve: FanPoint[]; original?: FanProfile }
const curveRoute = (id: string) => `${DECKYZONE_FAN_CURVES_ROUTE}/${id}`
const sameCurve = (a: FanPoint[], b: FanPoint[]) => JSON.stringify(a) === JSON.stringify(b)
const draftFor = (state: FanControlState, profile?: FanProfile): Draft => ({
  name: profile?.name ?? '', curve: profile?.curve ?? state.defaultCurve, original: profile,
})

export default function FanCurvesPage() {
  const { state, saving, change, mounted } = useFanControl()
  // Keep unfinished edits while switching sidebar pages, without applying them.
  const [drafts, setDrafts] = useState<Record<string, Draft | undefined>>({})
  const [editorVersions, setEditorVersions] = useState<Record<string, number>>({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const updateDraft = (id: string, draft: Draft | undefined) => setDrafts(current => ({ ...current, [id]: draft }))
  const resetDraft = (id: string, draft?: Draft) => {
    updateDraft(id, draft)
    setEditorVersions(current => ({ ...current, [id]: (current[id] ?? 0) + 1 }))
  }

  const openImport = async () => {
    let available: PowerControlFanProfile[] = []
    try {
      const next = await change(async () => {
        const [profiles, status] = await Promise.all([fanApi.imports(), fanApi.status()])
        available = profiles
        return { ok: true, state: status }
      })
      if (!mounted.current) return
      setDialogOpen(true)
      showModal(<FanImportDialog profiles={available}
        onImport={async () => { await change(() => fanApi.import(available, next.revision)) }}
        onClose={() => { if (mounted.current) setDialogOpen(false) }} />)
    } catch { /* The shared transaction reports the error. */ }
  }

  if (!state) return <SettingsPage title="Fan curves"><DialogBody><SteamSpinner /></DialogBody></SettingsPage>
  const busy = saving || dialogOpen
  const atLimit = state.profiles.length >= state.maxProfiles

  const save = async (id: string, draft: Draft, curve: FanPoint[]) => {
    const previousIds = state.profiles.map(profile => profile.id)
    const next = await change(latest => {
      const original = draft.original
      if (original) {
        const current = latest.profiles.find(profile => profile.id === original.id)
        if (!current || current.name !== original.name || !sameCurve(current.curve, original.curve)) {
          throw new Error('This curve changed. Discard your edits to reload it.')
        }
      }
      return fanApi.save(original?.id ?? null, draft.name, curve, latest.revision)
    })
    if (!mounted.current) return
    const saved = next.profiles.find(profile => draft.original
      ? profile.id === draft.original.id : !previousIds.includes(profile.id))
    resetDraft(id, saved && id !== 'new' ? draftFor(next, saved) : undefined)
    if (id === 'new' && saved) Navigation.Navigate(curveRoute(saved.id))
  }

  const duplicate = async (profile: FanProfile) => {
    try {
      const previousIds = state.profiles.map(item => item.id)
      const next = await change(latest => fanApi.duplicate(profile.id, latest.revision))
      const copied = next.profiles.find(item => !previousIds.includes(item.id))
      if (mounted.current && copied) Navigation.Navigate(curveRoute(copied.id))
    } catch { /* The shared transaction reports the error. */ }
  }

  const deleteCurve = (profile: FanProfile) => {
    setDialogOpen(true)
    showModal(<FanDeleteDialog name={profile.name}
      onDelete={async () => {
        const next = await change(latest => fanApi.delete(profile.id, latest.revision))
        if (!mounted.current) return
        resetDraft(profile.id)
        const index = state.profiles.findIndex(item => item.id === profile.id)
        Navigation.Navigate(curveRoute(next.profiles[index]?.id ?? next.profiles[index - 1]?.id ?? 'new'))
      }}
      onClose={() => { if (mounted.current) setDialogOpen(false) }} />)
  }

  const editor = (id: string, profile?: FanProfile) => {
    const draft = drafts[id] ?? draftFor(state, profile)
    const dirty = !profile || draft.name !== profile.name || !sameCurve(draft.curve, profile.curve)
    return <DialogBody>
      <SettingsGroup>
        <Field label="Curve name" childrenLayout="inline" childrenContainerWidth="fixed" inlineWrap="keep-inline">
          <TextField aria-label="Curve name" value={draft.name} disabled={busy} style={{ padding: '6px 16px' }}
            onChange={event => updateDraft(id, { ...draft, name: event.target.value })} />
        </Field>
        <FanCurveEditor key={`${id}:${editorVersions[id] ?? 0}`} curve={draft.curve} disabled={busy}
          saveLabel={profile ? profile.id === state.selectedProfileId && state.mode === 'curve' ? 'Save and apply' : 'Save curve' : 'Add curve'}
          saveDisabled={!draft.name.trim() || !dirty || (!profile && atLimit)}
          cancelLabel="Discard changes" cancelDisabled={!dirty}
          onChange={curve => updateDraft(id, { ...draft, curve })}
          onSave={curve => save(id, draft, curve)} onCancel={() => resetDraft(id)} />
      </SettingsGroup>
      {profile && <SettingsGroup>
        <ButtonItem label="Duplicate curve" layout="inline" disabled={busy || atLimit}
          onClick={() => void duplicate(profile)}>Duplicate</ButtonItem>
        <ButtonItem label="Delete curve" layout="inline" disabled={busy}
          onClick={() => deleteCurve(profile)}>Delete</ButtonItem>
      </SettingsGroup>}
    </DialogBody>
  }

  return <SettingsPage title="Fan curves">
    <SidebarNavigation showTitle={false} disableRouteReporting pages={[
      ...state.profiles.map(profile => ({
        title: profile.name,
        visible: true,
        icon: <FiTrendingUp />,
        route: curveRoute(profile.id),
        content: editor(profile.id, profile),
      })),
      ...(state.profiles.length ? ['separator' as const] : []),
      {
        // Steam keeps separators only when a following page is explicitly visible.
        title: 'New curve', visible: true, icon: <FiPlus />, route: curveRoute('new'),
        content: atLimit ? <DialogBody><SettingsGroup><Field focusable label="Saved curve limit reached">{state.maxProfiles}</Field></SettingsGroup></DialogBody> : editor('new'),
      },
      {
        title: 'Import', visible: true, icon: <FiDownload />, route: curveRoute('import'),
        content: <DialogBody><SettingsGroup>
          <ButtonItem label="Import from PowerControl" layout="inline" disabled={busy || atLimit}
            onClick={() => void openImport()}>Import</ButtonItem>
          {atLimit && <Field focusable label="Saved curve limit reached">{state.maxProfiles}</Field>}
        </SettingsGroup></DialogBody>,
      },
    ]} />
  </SettingsPage>
}
