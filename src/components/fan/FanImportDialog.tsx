import { ConfirmModal } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import type { PowerControlFanProfile } from '../../types/plugin'

type Props = {
  profiles: PowerControlFanProfile[]
  onImport: () => Promise<void>
  onClose: () => void
  closeModal?: () => void
}

// Use the same asynchronous ConfirmModal pattern as ResetPluginConfirmModal.
export default function FanImportDialog({ profiles, onImport, onClose, closeModal }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inFlight = useRef(false)
  useEffect(() => () => onClose(), [onClose])
  const importAll = async () => {
    if (inFlight.current) return
    inFlight.current = true; setSaving(true); setError('')
    try {
      await onImport()
      closeModal?.()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Couldn't import curves")
      inFlight.current = false; setSaving(false)
    }
  }
  return (
    <ConfirmModal closeModal={closeModal} strTitle="Import from PowerControl"
      strOKButtonText={saving ? 'Importing…' : 'Import'} strCancelButtonText={profiles.length ? 'Cancel' : 'Close'}
      bOKDisabled={saving || !profiles.length} bCancelDisabled={saving}
      onOK={() => void importAll()}>
      <p>{profiles.length ? `Found ${profiles.length} custom curve${profiles.length === 1 ? '' : 's'}.` : 'No fan curves available to import.'}</p>
      {!!profiles.length && <>
        <ul>{profiles.map(profile => <li key={profile.name}>{profile.name}</li>)}</ul>
        <p>Matching names get a number added.</p>
      </>}
      {error && <p role="alert">{error}</p>}
    </ConfirmModal>
  )
}
