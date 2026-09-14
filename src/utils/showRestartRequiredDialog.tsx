import { ConfirmModal, showModal } from '@decky/ui'
import type { ComponentProps, ComponentType } from 'react'

const FocusedConfirmModal = ConfirmModal as ComponentType<
  ComponentProps<typeof ConfirmModal> & { focusButton: 'primary' | 'secondary' }
>

const restartDevice = () => {
  SteamClient.System.RestartPC()
}

export function showRestartRequiredDialog() {
  showModal(
    <FocusedConfirmModal
      strTitle="Restart Required"
      strDescription="You will need to restart SteamOS in order to apply this change."
      strOKButtonText="Restart Now"
      strCancelButtonText="Restart Later"
      onOK={restartDevice}
      focusButton="secondary"
    />,
  )
}
