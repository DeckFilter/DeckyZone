import { ButtonItem, ConfirmModal, Navigation, Spinner, showModal } from '@decky/ui'
import { useState } from 'react'
import { openDeckyZoneSettings } from '../routes'
import type { PluginResetResult } from '../types/plugin'
import { showDeckyToast } from '../utils/toasts'
import { SettingsRow, SettingsSection, useSettingsItemLayout, useSettingsSurface } from './SettingsSurface'

type Props = {
  onResetPlugin: () => Promise<ResetPluginOutcome>
  showOpenSettings?: boolean
}

type ResetPluginConfirmModalProps = Props & {
  closeModal?: () => void
}

export type ResetPluginOutcome = {
  result: PluginResetResult
  glyphCleanupFailed: boolean
}

const RESET_FAILED_NOTICE = 'Reset failed.'
const RESET_COMPLETE_NOTICE = 'Plugin reset complete.'

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

const TroubleshootingPanel = ({ onResetPlugin, showOpenSettings = true }: Props) => {
  const itemLayout = useSettingsItemLayout()
  const surface = useSettingsSurface()

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
        <ButtonItem
          layout={itemLayout}
          description={surface === 'settings' ? 'Clears saved settings and removes active runtime changes' : undefined}
          onClick={() => {
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
