import { ConfirmModal } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import type { PowerControlFanProfile } from '../../types/plugin'
import { SteamExplainerDropdownItem } from '../SteamExplainer'

type Props = {
  profiles: PowerControlFanProfile[]
  onImport: (profile: PowerControlFanProfile) => void
  onClose: () => void
  closeModal?: () => void
}

// Import replaces the editor draft. Save remains the only settings write.
export default function FanImportDialog({ profiles, onImport, onClose, closeModal }: Props) {
  const [selectedName, setSelectedName] = useState(profiles[0]?.name)
  const confirmed = useRef(false)
  useEffect(() => () => onClose(), [onClose])
  const selected = profiles.find(profile => profile.name === selectedName)
  const importCurve = () => {
    if (confirmed.current || !selected) return
    confirmed.current = true
    onImport(selected)
    closeModal?.()
  }
  return (
    <ConfirmModal closeModal={closeModal} strTitle="Import from PowerControl"
      strOKButtonText="Import" strCancelButtonText={profiles.length ? 'Cancel' : 'Close'}
      bOKDisabled={!selected} onOK={importCurve}>
      <p>{profiles.length ? `Found ${profiles.length} custom curve${profiles.length === 1 ? '' : 's'}.` : 'No fan curves available to import.'}</p>
      {!!profiles.length && <>
        {profiles.length > 1
          ? <SteamExplainerDropdownItem label="Curve" layout="inline" controlled selectedOption={selectedName}
            rgOptions={profiles.map(profile => ({ data: profile.name, label: profile.name }))}
            onChange={option => setSelectedName(option.data)} />
          : <p>{selected?.name}</p>}
        <p>Replaces the curve in the editor. Save to apply it.</p>
      </>}
    </ConfirmModal>
  )
}
