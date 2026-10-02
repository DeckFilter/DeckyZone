import { ConfirmModal, ProgressBar } from '@decky/ui'
import { useEffect, useState } from 'react'
import type { NativePerformanceResult } from '../types/plugin'

type Props = {
  operation: Promise<NativePerformanceResult>
  message: string
  closeModal?: () => void
}

// Reuse ResetPluginConfirmModal's native modal and locked asynchronous action.
export default function NativePerformanceProgressDialog({ operation, message, closeModal }: Props) {
  const [error, setError] = useState<string | null>(null)
  const busy = error === null
  useEffect(() => {
    let mounted = true
    operation.then(result => {
      if (!mounted) return
      if (result.ok) closeModal?.()
      else setError(result.error ?? "Couldn't enable native performance controls")
    }, () => {
      if (mounted) setError("Couldn't confirm the change. Check the native performance toggle.")
    })
    return () => { mounted = false }
  }, [operation, closeModal])
  const close = () => { if (!busy) closeModal?.() }
  return (
    <ConfirmModal
      strTitle="Native Performance Controls"
      bAlertDialog
      bDisableBackgroundDismiss
      bHideCloseIcon={busy}
      bOKDisabled={busy}
      bCancelDisabled={busy}
      closeModal={close}
      onCancel={close}
      onEscKeypress={close}
      onOK={close}
      strOKButtonText={busy ? 'Working…' : 'Close'}
    >
      <p role={error ? 'alert' : 'status'}>{error ?? message}</p>
      {busy && <ProgressBar indeterminate />}
    </ConfirmModal>
  )
}
