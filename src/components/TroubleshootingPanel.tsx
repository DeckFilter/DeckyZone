import { callable } from '@decky/api'
import { ButtonItem, ConfirmModal, Navigation, Spinner, showModal } from '@decky/ui'
import { useEffect, useRef, useState } from 'react'
import { openDeckyZoneSettings } from '../routes'
import type { PluginReapplyResult, PluginResetResult } from '../types/plugin'
import { showDeckyToast } from '../utils/toasts'
import { SettingsRow, SettingsSection, useSettingsItemLayout } from './SettingsSurface'
import { SteamExplainerButtonItem } from './SteamExplainer'

type Props = {
  onResetPlugin: () => Promise<ResetPluginOutcome>
  onReapplyControllerProfile: () => Promise<PluginReapplyResult>
  showOpenSettings?: boolean
  showReinstallPlugin?: boolean
}

type ResetPluginConfirmModalProps = Pick<Props, 'onResetPlugin'> & {
  closeModal?: () => void
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
}: ResetPluginConfirmModalProps) => {
  const [resetting, setResetting] = useState(false)

  const handleReset = async () => {
    setResetting(true)
    let shouldClose = false

    try {
      const { result, glyphCleanupFailed } = await onResetPlugin()

      if (result.ok && !glyphCleanupFailed) {
        showDeckyToast({
          title: 'Troubleshooting',
          body: RESET_COMPLETE_NOTICE,
          severity: 'success',
        })
      } else {
        showDeckyToast({
          title: 'Troubleshooting',
          body: getPartialResetNotice(result, glyphCleanupFailed),
          severity: 'warning',
        })
      }

      shouldClose = true
    } catch {
      showDeckyToast({
        title: 'Troubleshooting',
        body: RESET_FAILED_NOTICE,
        severity: 'error',
      })
    } finally {
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
  showOpenSettings = true,
  showReinstallPlugin = false,
}: Props) => {
  const itemLayout = useSettingsItemLayout()
  const [isReinstalling, setIsReinstalling] = useState(false)
  const [isReapplying, setIsReapplying] = useState(false)
  const reinstallingRef = useRef(false)
  const reapplyingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handleReinstall = async () => {
    if (reinstallingRef.current || reapplyingRef.current) {
      return
    }

    reinstallingRef.current = true
    setIsReinstalling(true)
    try {
      const success = await otaUpdate()
      if (!success) {
        showDeckyToast({
          title: 'Troubleshooting',
          body: REINSTALL_FAILED_NOTICE,
          severity: 'error',
        })
      }
    } catch {
      showDeckyToast({
        title: 'Troubleshooting',
        body: REINSTALL_FAILED_NOTICE,
        severity: 'error',
      })
    } finally {
      reinstallingRef.current = false
      if (isMountedRef.current) {
        setIsReinstalling(false)
      }
    }
  }

  const handleReapply = async () => {
    if (reapplyingRef.current || reinstallingRef.current) {
      return
    }

    reapplyingRef.current = true
    setIsReapplying(true)
    try {
      const result = await onReapplyControllerProfile()
      showDeckyToast({
        title: 'Troubleshooting',
        body: result.ok
          ? 'Controller profile reapplied.'
          : result.status.message || REAPPLY_FAILED_NOTICE,
        severity: result.ok ? 'success' : 'error',
      })
    } catch {
      showDeckyToast({
        title: 'Troubleshooting',
        body: REAPPLY_FAILED_NOTICE,
        severity: 'error',
      })
    } finally {
      reapplyingRef.current = false
      if (isMountedRef.current) {
        setIsReapplying(false)
      }
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
          disabled={isReapplying || isReinstalling}
          onClick={() => void handleReapply()}
        >
          {isReapplying ? 'Reapplying...' : 'Reapply Controller Profile'}
        </SteamExplainerButtonItem>
      </SettingsRow>
      {showReinstallPlugin && (
        <SettingsRow>
          <ButtonItem
            layout={itemLayout}
            label="Reinstall Plugin"
            disabled={isReinstalling || isReapplying}
            onClick={() => void handleReinstall()}
          >
            {isReinstalling ? 'Reinstalling...' : 'Reinstall Plugin'}
          </ButtonItem>
        </SettingsRow>
      )}
      <SettingsRow>
        <ButtonItem
          layout={itemLayout}
          label="Reset Plugin"
          disabled={isReapplying || isReinstalling}
          onClick={() => {
            if (reapplyingRef.current || reinstallingRef.current) {
              return
            }
            showModal(
              <ResetPluginConfirmModal
                onResetPlugin={onResetPlugin}
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
