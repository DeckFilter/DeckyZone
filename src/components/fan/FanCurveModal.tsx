import { ModalRoot } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import type { FanPoint } from '../../types/plugin'
import FanCurveEditor from './FanCurveEditor'

type Props = {
  curve: FanPoint[]
  savedCurve: FanPoint[]
  disabled: boolean
  onSave: (curve: FanPoint[]) => Promise<void>
  onCancel: () => void
  closeModal?: () => void
}

export default function FanCurveModal({ curve, savedCurve, disabled, onSave, onCancel, closeModal }: Props) {
  const [draft, setDraft] = useState(() => curve.map(point => ({ ...point })))
  const original = useRef(savedCurve.map(point => ({ ...point })))
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  const closed = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const cancel = () => {
    if (inFlight.current || closed.current) return
    closed.current = true
    onCancel()
    closeModal?.()
  }
  const save = async (points: FanPoint[]) => {
    if (disabled || inFlight.current || closed.current) return
    inFlight.current = true
    setSaving(true)
    try {
      await onSave(points)
      if (mounted.current) {
        closed.current = true
        closeModal?.()
      }
    } finally {
      inFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }

  return (
    <ModalRoot onCancel={cancel} onEscKeypress={cancel} closeModal={cancel}
      bDisableBackgroundDismiss={saving} bHideCloseIcon={saving} bCancelDisabled={saving}>
      <h1 style={{ marginBlockEnd: '5px', marginBlockStart: '-15px', fontSize: 25 }}>Edit Curve</h1>
      <FanCurveEditor curve={draft} disabled={disabled || saving} onChange={setDraft}
        saveDisabled={JSON.stringify(draft) === JSON.stringify(original.current)}
        cancelDisabled={saving} onSave={save} onCancel={cancel} />
    </ModalRoot>
  )
}
