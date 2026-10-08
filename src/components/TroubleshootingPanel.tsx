import { callable } from '@decky/api'
import { ButtonItem, ConfirmModal, Navigation, Spinner, showModal } from '@decky/ui'
import { useCallback, useEffect, useRef, useState } from 'react'
import { openDeckyZoneSettings } from '../routes'
import type { InputPlumberUpdateResult, PluginReapplyResult, PluginResetResult } from '../types/plugin'
import { showDeckyToast } from '../utils/toasts'
import { SettingsRow, SettingsSection, useSettingsItemLayout } from './SettingsSurface'
import { SteamExplainerButtonItem } from './SteamExplainer'
import InputPlumberUpdateControls from './InputPlumberUpdateControls'

type TroubleshootingOperation = 'reapply' | 'reinstall' | 'reset' | 'inputplumber'

type Props = {
  onResetPlugin: () => Promise<ResetPluginOutcome>
  onReapplyControllerProfile: () => Promise<PluginReapplyResult>
  onUpdateInputPlumber: (restore: boolean, expectedVersion: string | null) => Promise<InputPlumberUpdateResult>
  showOpenSettings?: boolean
  showReinstallPlugin?: boolean
}

type ResetPluginConfirmModalProps = Pick<Props, 'onResetPlugin'> & {
  closeModal?: () => void
  onBeginOperation: () => boolean
  onEndOperation: () => void
}

export type ResetPluginOutcome = {
  result: PluginResetResult
  glyphCleanupFailed: boolean
}

const RESET_FAILED_NOTICE = 'Reset failed.'
const RESET_COMPLETE_NOTICE = 'Plugin reset complete.'
const REINSTALL_FAILED_NOTICE = 'Reinstall failed.'
const REAPPLY_FAILED_NOTICE = 'Could not reapply the controller profile.'
const REAPPLY_PROFILE_EXPLAINER = 'Reloads your dial, trackpad and Home button settings. Uses global settings when no game is running, and includes enabled game overrides when a game is running. Saved settings are kept.'
const otaUpdate = callable<[], boolean>('ota_update')

const titleStyle = {
  display: 'flex',
  flexDirection: 'row' as const,
  alignItems: 'center',
  width: '100%',
}

const spinnerStyle = {
  marginLeft: 'auto',
}

function getPartialResetNotice(result: PluginResetResult, glyphCleanupFailed: boolean) {
  const failedStepCount = result.steps.filter((step) => !step.ok).length
  if (glyphCleanupFailed && failedStepCount > 0) {
    return `${failedStepCount} backend cleanup step${failedStepCount === 1 ? '' : 's'} failed; live glyph cleanup also failed.`
  }

  if (failedStepCount > 0) {
    return `${failedStepCount} backend cleanup step${failedStepCount === 1 ? '' : 's'} failed.`
  }

  return 'Live glyph cleanup failed.'
}

const ResetPluginConfirmModal = ({
  closeModal,
  onResetPlugin,
  onBeginOperation,
  onEndOperation,
}: ResetPluginConfirmModalProps) => {
  const [resetting, setResetting] = useState(false)
  const resettingRef = useRef(false)

  const handleReset = async () => {
    if (resettingRef.current) {
      return
    }
    if (!onBeginOperation()) {
      showDeckyToast({
        title: 'DeckyZone',
        body: 'Another troubleshooting action is running. Wait for it to finish.',
        severity: 'error',
      })
      return
    }
    resettingRef.current = true
    setResetting(true)
    let shouldClose = false

    try {
      const { result, glyphCleanupFailed } = await onResetPlugin()

      if (result.ok && !glyphCleanupFailed) {
        showDeckyToast({
          title: 'DeckyZone',
          body: RESET_COMPLETE_NOTICE,
          severity: 'success',
        })
      } else {
        showDeckyToast({
          title: 'DeckyZone',
          body: getPartialResetNotice(result, glyphCleanupFailed),
          severity: 'warning',
        })
      }

      shouldClose = true
    } catch {
      showDeckyToast({
        title: 'DeckyZone',
        body: RESET_FAILED_NOTICE,
        severity: 'error',
      })
    } finally {
      resettingRef.current = false
      onEndOperation()
      setResetting(false)
      if (shouldClose) {
        closeModal?.()
        Navigation.CloseSideMenus()
      }
    }
  }

  return (
    <ConfirmModal
      closeModal={closeModal}
      onOK={() => void handleReset()}
      bOKDisabled={resetting}
      bCancelDisabled={resetting}
      strTitle={
        <div style={titleStyle}>
          Reset Plugin
          {resetting && <Spinner width="24px" height="24px" style={spinnerStyle} />}
        </div>
      }
      strOKButtonText="Reset"
    >
      Clears DeckyZone settings and removes active runtime changes. The plugin stays installed.
    </ConfirmModal>
  )
}

const TroubleshootingPanel = ({
  onResetPlugin,
  onReapplyControllerProfile,
  onUpdateInputPlumber,
  showOpenSettings = true,
  showReinstallPlugin = false,
}: Props) => {
  const itemLayout = useSettingsItemLayout()
  const [operation, setOperation] = useState<TroubleshootingOperation | null>(null)
  const [inputPlumberBusy, setInputPlumberBusy] = useState(false)
  const operationRef = useRef<TroubleshootingOperation | null>(null)
  const inputPlumberBusyRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const beginOperation = useCallback((nextOperation: TroubleshootingOperation) => {
    if (!isMountedRef.current || operationRef.current !== null || inputPlumberBusyRef.current) {
      return false
    }
    operationRef.current = nextOperation
    if (isMountedRef.current) {
      setOperation(nextOperation)
    }
    return true
  }, [])

  const endOperation = useCallback((completedOperation: TroubleshootingOperation) => {
    if (operationRef.current === completedOperation) {
      operationRef.current = null
      if (isMountedRef.current) {
        setOperation(null)
      }
    }
  }, [])

  const handleInputPlumberBusyChange = useCallback((busy: boolean) => {
    inputPlumberBusyRef.current = busy
    if (isMountedRef.current) {
      setInputPlumberBusy(busy)
    }
  }, [])

  const busy = operation !== null || inputPlumberBusy

  const handleReinstall = async () => {
    if (!beginOperation('reinstall')) {
      return
    }
    try {
      const success = await otaUpdate()
      if (!success) {
        showDeckyToast({
          title: 'DeckyZone',
          body: REINSTALL_FAILED_NOTICE,
          severity: 'error',
        })
      }
    } catch {
      showDeckyToast({
        title: 'DeckyZone',
        body: REINSTALL_FAILED_NOTICE,
        severity: 'error',
      })
    } finally {
      endOperation('reinstall')
    }
  }

  const handleReapply = async () => {
    if (!beginOperation('reapply')) {
      return
    }

    try {
      const result = await onReapplyControllerProfile()
      showDeckyToast({
        title: 'DeckyZone',
        body: result.ok
          ? 'Controller profile reapplied.'
          : result.status.message || REAPPLY_FAILED_NOTICE,
        severity: result.ok ? 'success' : 'error',
      })
    } catch {
      showDeckyToast({
        title: 'DeckyZone',
        body: REAPPLY_FAILED_NOTICE,
        severity: 'error',
      })
    } finally {
      endOperation('reapply')
    }
  }

  return (
    <SettingsSection title="Troubleshooting">
      {showOpenSettings && (
        <SettingsRow>
          <ButtonItem
            layout={itemLayout}
            onClick={openDeckyZoneSettings}
          >
            Open Settings
          </ButtonItem>
        </SettingsRow>
      )}
      <SettingsRow>
        <SteamExplainerButtonItem
          layout={itemLayout}
          label="Reapply Controller Profile"
          explainerTitle="Reapply Controller Profile"
          explainer={REAPPLY_PROFILE_EXPLAINER}
          disabled={busy}
          onClick={() => void handleReapply()}
        >
          {operation === 'reapply' ? 'Reapplying...' : 'Reapply Controller Profile'}
        </SteamExplainerButtonItem>
      </SettingsRow>
      <InputPlumberUpdateControls
        disabled={busy}
        onUpdateInputPlumber={onUpdateInputPlumber}
        onBeginOperation={() => beginOperation('inputplumber')}
        onEndOperation={() => endOperation('inputplumber')}
        onStatusBusyChange={handleInputPlumberBusyChange}
      />
      {showReinstallPlugin && (
        <SettingsRow>
          <ButtonItem
            layout={itemLayout}
            label="Reinstall Plugin"
            disabled={busy}
            onClick={() => void handleReinstall()}
          >
            {operation === 'reinstall' ? 'Reinstalling...' : 'Reinstall Plugin'}
          </ButtonItem>
        </SettingsRow>
      )}
      <SettingsRow>
        <ButtonItem
          layout={itemLayout}
          label="Reset Plugin"
          disabled={busy}
          onClick={() => {
            if (operationRef.current !== null || inputPlumberBusyRef.current) {
              return
            }
            showModal(
              <ResetPluginConfirmModal
                onResetPlugin={onResetPlugin}
                onBeginOperation={() => beginOperation('reset')}
                onEndOperation={() => endOperation('reset')}
              />,
            )
          }}
        >
          Reset Plugin
        </ButtonItem>
      </SettingsRow>
    </SettingsSection>
  )
}

export default TroubleshootingPanel
