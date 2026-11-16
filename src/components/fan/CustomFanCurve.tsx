import { ButtonItem, showModal } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import type { FanControlState, FanPoint, PowerControlFanProfile } from '../../types/plugin'
import FanCurveModal from './FanCurveModal'
import FanImportDialog from './FanImportDialog'
import { fanApi, type useFanControl } from './useFanControl'

type Props = {
  state: FanControlState | null
  busy: boolean
  change: ReturnType<typeof useFanControl>['change']
  onDialogChange: (open: boolean) => void
}
type Draft = { curve: FanPoint[]; original: FanPoint[] }
type CurveDialog = {
  handle: ReturnType<typeof showModal>
  props: {
    curve: FanPoint[]
    savedCurve: FanPoint[]
    onSave: (points: FanPoint[]) => Promise<void>
    onCancel: () => void
    closeModal: () => void
  }
}
const sameCurve = (a: FanPoint[], b: FanPoint[]) => JSON.stringify(a) === JSON.stringify(b)

// Keep drafts through mode changes; only Save writes the curve to the backend.
export default function CustomFanCurve({ state, busy, change, onDialogChange }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const curveDialog = useRef<CurveDialog | null>(null)
  const mounted = useRef(false)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      curveDialog.current?.handle.Close()
      curveDialog.current = null
    }
  }, [])
  const edit = (points: FanPoint[]) => {
    if (state) setDraft(current => ({ curve: points, original: current?.original ?? state.curve }))
  }
  const discard = () => { setDraft(null) }

  const editorDisabled = !state || !state.available || !!state.blockedReason
    || state.suspended || state.mode !== 'custom'
  useEffect(() => {
    const dialog = curveDialog.current
    if (dialog) dialog.handle.Update(<FanCurveModal {...dialog.props} disabled={editorDisabled} />)
  }, [state, editorDisabled])

  const save = async (points: FanPoint[]) => {
    if (!state) throw new Error('Fan control is unavailable')
    const original = draft?.original ?? state.curve
    await change(latest => {
      if (!sameCurve(latest.curve, original)) {
        throw new Error('The curve changed. Cancel and reopen the editor to reload it.')
      }
      return fanApi.save(points, latest.revision)
    })
    if (mounted.current) discard()
  }

  const openCurve = () => {
    if (!state || busy || curveDialog.current) return
    const props = {
      curve: (draft?.curve ?? state.curve).map(point => ({ ...point })),
      savedCurve: state.curve.map(point => ({ ...point })),
      onSave: save,
      onCancel: discard,
      closeModal: () => curveDialog.current?.handle.Close(),
    }
    const dialog = { props, handle: showModal(<FanCurveModal {...props} disabled={editorDisabled} />) }
    curveDialog.current = dialog
    onDialogChange(true)
    void dialog.handle.ClosedPromise.then(() => {
      if (curveDialog.current !== dialog) return
      curveDialog.current = null
      if (mounted.current) onDialogChange(false)
    })
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
          }
        }}
        onClose={() => { if (mounted.current) onDialogChange(false) }} />)
    } catch { /* The shared transaction reports the error. */ }
  }

  if (!state || state.mode !== 'custom') return null
  const curve = draft?.curve ?? state.curve
  const dirty = !sameCurve(curve, state.curve)
  return <>
    <ButtonItem label="Fan curve" layout="inline" disabled={busy}
      description={dirty ? 'Unsaved changes' : undefined} onClick={openCurve}>Edit Curve</ButtonItem>
    <ButtonItem label="Import from PowerControl" layout="inline" disabled={busy}
      onClick={() => void openImport()}>Import</ButtonItem>
    <ButtonItem label="Reset to default" layout="inline" disabled={busy || sameCurve(curve, state.defaultCurve)}
      onClick={() => edit(state.defaultCurve)}>Reset</ButtonItem>
  </>
}
