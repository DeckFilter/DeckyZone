import { ButtonItem, showModal } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import type { FanControlState, FanPoint, PowerControlFanProfile } from '../../types/plugin'
import FanCurveEditor from './FanCurveEditor'
import FanImportDialog from './FanImportDialog'
import { fanApi, type useFanControl } from './useFanControl'

type Props = {
  state: FanControlState | null
  busy: boolean
  change: ReturnType<typeof useFanControl>['change']
  onDialogChange: (open: boolean) => void
}
type Draft = { curve: FanPoint[]; original: FanPoint[] }
const sameCurve = (a: FanPoint[], b: FanPoint[]) => JSON.stringify(a) === JSON.stringify(b)

// Keep drafts through mode changes; only Save writes the curve to the backend.
export default function CustomFanCurve({ state, busy, change, onDialogChange }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editorVersion, setEditorVersion] = useState(0)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  const edit = (points: FanPoint[]) => {
    if (state) setDraft(current => ({ curve: points, original: current?.original ?? state.curve }))
  }
  const discard = () => { setDraft(null); setEditorVersion(version => version + 1) }

  const save = async (points: FanPoint[]) => {
    if (!state) throw new Error('Fan control is unavailable')
    const original = draft?.original ?? state.curve
    await change(latest => {
      if (!sameCurve(latest.curve, original)) {
        throw new Error('The curve changed. Discard your edits to reload it.')
      }
      return fanApi.save(points, latest.revision)
    })
    if (mounted.current) discard()
  }

  const openImport = async () => {
    let profiles: PowerControlFanProfile[] = []
    try {
      const next = await change(async () => {
        const [available, status] = await Promise.all([fanApi.imports(), fanApi.status()])
        profiles = available
        return { ok: true, state: status }
      })
      if (!mounted.current || next.mode !== 'custom') return
      onDialogChange(true)
      showModal(<FanImportDialog profiles={profiles}
        onImport={profile => {
          if (mounted.current) {
            setDraft(current => ({ curve: profile.curve, original: current?.original ?? next.curve }))
            setEditorVersion(version => version + 1)
          }
        }}
        onClose={() => { if (mounted.current) onDialogChange(false) }} />)
    } catch { /* The shared transaction reports the error. */ }
  }

  if (!state || state.mode !== 'custom') return null
  const curve = draft?.curve ?? state.curve
  const dirty = !sameCurve(curve, state.curve)
  return <>
    <FanCurveEditor key={editorVersion} curve={curve} disabled={busy}
      saveLabel="Save and apply" saveDisabled={!dirty}
      cancelLabel="Discard changes" cancelDisabled={!draft}
      onChange={edit} onSave={save} onCancel={discard} />
    <ButtonItem label="Import from PowerControl" layout="inline" disabled={busy}
      onClick={() => void openImport()}>Import</ButtonItem>
    <ButtonItem label="Reset to default" layout="inline" disabled={busy || sameCurve(curve, state.defaultCurve)}
      onClick={() => { edit(state.defaultCurve); setEditorVersion(version => version + 1) }}>Reset</ButtonItem>
  </>
}
