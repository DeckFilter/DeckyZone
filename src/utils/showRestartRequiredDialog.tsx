import { ConfirmModal, DialogHeader, ModalRoot, Spinner, showModal } from '@decky/ui'
import { useEffect, type ComponentProps, type ComponentType } from 'react'
import { showDeckyToast } from './toasts'

const FocusedConfirmModal = ConfirmModal as ComponentType<
  ComponentProps<typeof ConfirmModal> & { focusButton: 'primary' | 'secondary' }
>

type RestartTarget = 'SteamOS' | 'Decky Loader'
let restartNotice: ReturnType<typeof showModal> | null = null

const RestartNotice = ({ target, onReady }: { target: RestartTarget; onReady: () => void }) => {
  useEffect(() => {
    // Let the notice paint before an action can interrupt Steam or Decky.
    let secondFrame = 0
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(onReady)
    })
    return () => {
      cancelAnimationFrame(firstFrame)
      cancelAnimationFrame(secondFrame)
    }
  }, [onReady])

  return (
    <ModalRoot bDisableBackgroundDismiss bHideCloseIcon onCancel={() => {}} onEscKeypress={() => {}}>
      <DialogHeader>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Restarting {target}…
          <Spinner width="24px" height="24px" />
        </span>
      </DialogHeader>
    </ModalRoot>
  )
}

export function closeRestartNotice() {
  restartNotice?.Close()
  restartNotice = null
}

export async function showRestartNotice(target: RestartTarget, restart: () => unknown | Promise<unknown>) {
  if (restartNotice) throw new Error('A restart is already in progress')
  try {
    await new Promise<void>((resolve) => {
      restartNotice = showModal(<RestartNotice target={target} onReady={resolve} />)
    })
    await restart()
  } catch (error) {
    closeRestartNotice()
    throw error
  }
}

export function showRestartRequiredDialog() {
  showModal(
    <FocusedConfirmModal
      strTitle="Restart Required"
      strDescription="You will need to restart SteamOS in order to apply this change."
      strOKButtonText="Restart Now"
      strCancelButtonText="Restart Later"
      onOK={() => {
        void showRestartNotice('SteamOS', () => SteamClient.System.RestartPC()).catch(() => {
          showDeckyToast({ title: 'Restart', body: 'Couldn’t restart SteamOS. Try again.', severity: 'error' })
        })
      }}
      focusButton="secondary"
    />,
  )
}
