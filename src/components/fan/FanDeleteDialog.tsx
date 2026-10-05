import { ConfirmModal, DialogBodyText } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'

type Props = {
  name: string
  onDelete: () => Promise<void>
  onClose: () => void
  closeModal?: () => void
}

export default function FanDeleteDialog({ name, onDelete, onClose, closeModal }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; onClose() }
  }, [onClose])
  const close = () => { if (!inFlight.current) closeModal?.() }
  const remove = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setSaving(true)
    setError('')
    try {
      await onDelete()
      if (mounted.current) closeModal?.()
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : "Couldn't delete curve")
    } finally {
      inFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }
  return <ConfirmModal strTitle={`Delete “${name}”?`} strOKButtonText={saving ? 'Deleting…' : 'Delete'}
    strCancelButtonText="Cancel" bDestructiveWarning bOKDisabled={saving} bCancelDisabled={saving}
    bDisableBackgroundDismiss={saving} bHideCloseIcon={saving}
    closeModal={close} onCancel={close} onEscKeypress={close} onOK={() => void remove()}>
    {error && <DialogBodyText>{error}</DialogBodyText>}
  </ConfirmModal>
}
