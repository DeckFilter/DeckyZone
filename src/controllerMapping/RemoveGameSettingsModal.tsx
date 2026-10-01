import { ConfirmModal, DialogBodyText } from '@decky/ui'
import { type ComponentProps, type ComponentType, useEffect, useRef, useState } from 'react'

const FocusedConfirmModal = ConfirmModal as ComponentType<
  ComponentProps<typeof ConfirmModal> & { focusButton: 'primary' | 'secondary' }
>

type Props = {
  title: string
  description: string
  onRemove: () => Promise<void>
  closeModal?: () => void
}

export default function RemoveGameSettingsModal({ title, description, onRemove, closeModal }: Props) {
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const close = () => {
    if (!inFlight.current) closeModal?.()
  }
  const remove = async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRemoving(true)
    setError('')
    try {
      await onRemove()
      if (mounted.current) closeModal?.()
    } catch (failure) {
      if (mounted.current) setError(String(failure))
    } finally {
      inFlight.current = false
      if (mounted.current) setRemoving(false)
    }
  }

  return (
    <FocusedConfirmModal
      strTitle={title}
      strDescription={description}
      strOKButtonText={removing ? 'Removing…' : 'Remove'}
      strCancelButtonText="Cancel"
      focusButton="secondary"
      bDestructiveWarning
      bDisableBackgroundDismiss={removing}
      bHideCloseIcon={removing}
      bOKDisabled={removing}
      bCancelDisabled={removing}
      onOK={() => void remove()}
      onCancel={close}
      onEscKeypress={close}
      closeModal={close}
    >
      {error && <DialogBodyText>{error}</DialogBodyText>}
    </FocusedConfirmModal>
  )
}
