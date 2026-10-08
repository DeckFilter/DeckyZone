import { callable } from '@decky/api'
import { ConfirmModal, Spinner, showModal } from '@decky/ui'
import { type ComponentProps, type ComponentType, useCallback, useEffect, useRef, useState } from 'react'
import type { InputPlumberUpdateResult, InputPlumberUpdateStatus } from '../types/plugin'
import { compareVersions, getLastCheckText } from '../utils/pluginUpdates'
import { showDeckyToast } from '../utils/toasts'
import { SettingsRow, useSettingsItemLayout } from './SettingsSurface'
import { SteamExplainerButtonItem } from './SteamExplainer'

type Props = {
  disabled: boolean
  onUpdateInputPlumber: (restore: boolean, expectedVersion: string | null) => Promise<InputPlumberUpdateResult>
  onBeginOperation: () => boolean
  onEndOperation: () => void
  onStatusBusyChange: (busy: boolean) => void
}

type ConfirmationProps = {
  restore: boolean
  targetVersion: string
  onConfirm: () => Promise<boolean>
  closeModal?: () => void
}

const getUpdateStatus = callable<[boolean], InputPlumberUpdateStatus>('get_inputplumber_update_status')
const FocusedConfirmModal = ConfirmModal as ComponentType<
  ComponentProps<typeof ConfirmModal> & { focusButton: 'primary' | 'secondary' }
>
const SYSTEM_UPDATE_NOTICE = 'SteamOS updates may reset this override. Check the active version after a system update.'
const PERSISTENCE_NOTICE = 'The override stays installed when DeckyZone is reset or removed. Restore the SteamOS InputPlumber version first to undo it.'
const UPDATE_EXPLAINER = `Installs an optional stable InputPlumber binary and matching controller configurations from the InputPlumber project. Controls pause while InputPlumber restarts. Your saved DeckyZone settings are kept. ${SYSTEM_UPDATE_NOTICE} ${PERSISTENCE_NOTICE}`
const RESTORE_EXPLAINER = 'Restores the InputPlumber version included with SteamOS and removes the optional override. Controls pause while InputPlumber restarts. Your saved DeckyZone settings are kept.'
const BUSY_NOTICE = 'Another troubleshooting action is running. Wait for it to finish.'

const InputPlumberUpdateConfirmation = ({ restore, targetVersion, onConfirm, closeModal }: ConfirmationProps) => {
  const [pending, setPending] = useState(false)
  const pendingRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handleClose = () => {
    if (!pendingRef.current) {
      closeModal?.()
    }
  }

  const handleConfirm = async () => {
    if (pendingRef.current) {
      return
    }
    pendingRef.current = true
    setPending(true)
    try {
      if (await onConfirm()) {
        closeModal?.()
      }
    } finally {
      pendingRef.current = false
      if (isMountedRef.current) {
        setPending(false)
      }
    }
  }

  return (
    <FocusedConfirmModal
      closeModal={handleClose}
      onCancel={handleClose}
      onEscKeypress={handleClose}
      onOK={() => void handleConfirm()}
      bOKDisabled={pending}
      bCancelDisabled={pending}
      focusButton="secondary"
      strTitle={
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {restore ? 'Restore SteamOS InputPlumber' : 'Update InputPlumber'}
          {pending && <Spinner width="24px" height="24px" />}
        </span>
      }
      strOKButtonText={restore ? 'Restore' : 'Update'}
    >
      <p>{restore
        ? `Restore InputPlumber ${targetVersion}, included with SteamOS?`
        : `Install InputPlumber ${targetVersion}?`}</p>
      <p>Controller input pauses while InputPlumber restarts. Your saved DeckyZone settings are kept.</p>
      {!restore && <p>{SYSTEM_UPDATE_NOTICE}</p>}
    </FocusedConfirmModal>
  )
}

const InputPlumberUpdateControls = ({
  disabled,
  onUpdateInputPlumber,
  onBeginOperation,
  onEndOperation,
  onStatusBusyChange,
}: Props) => {
  const itemLayout = useSettingsItemLayout()
  const [status, setStatus] = useState<InputPlumberUpdateStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [, setRelativeTimeTick] = useState(0)
  const [checkError, setCheckError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'update' | 'restore' | null>(null)
  const statusRequestRef = useRef(false)
  const statusGenerationRef = useRef(0)
  const confirmationOpenRef = useRef(false)
  const pendingRef = useRef(false)
  const isMountedRef = useRef(true)

  const applyStatus = useCallback((nextStatus: InputPlumberUpdateStatus) => {
    if (isMountedRef.current) {
      setStatus(nextStatus)
      onStatusBusyChange(nextStatus.busy)
    }
  }, [onStatusBusyChange])

  const loadStatus = useCallback(async (checkLatest: boolean) => {
    if (!isMountedRef.current || statusRequestRef.current || pendingRef.current) {
      return false
    }
    statusRequestRef.current = true
    const generation = ++statusGenerationRef.current
    if (isMountedRef.current) {
      setChecking(true)
      setCheckError(null)
    }
    try {
      const nextStatus = await getUpdateStatus(checkLatest)
      if (generation === statusGenerationRef.current) {
        applyStatus(nextStatus)
        if (isMountedRef.current) {
          setCheckError(nextStatus.checkError)
          if (checkLatest && nextStatus.checkError) {
            showDeckyToast({ title: 'DeckyZone', body: nextStatus.checkError, severity: 'error' })
          }
        }
      }
      return true
    } catch {
      if (isMountedRef.current && generation === statusGenerationRef.current) {
        const message = checkLatest
          ? 'Could not check InputPlumber updates.'
          : 'Could not load InputPlumber update status.'
        setCheckError(message)
        showDeckyToast({ title: 'DeckyZone', body: message, severity: 'error' })
      }
      return false
    } finally {
      statusRequestRef.current = false
      if (isMountedRef.current) {
        setChecking(false)
      }
    }
  }, [applyStatus])

  useEffect(() => {
    isMountedRef.current = true
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const probeStatus = async (attempt: number) => {
      if (await loadStatus(false) || cancelled || attempt >= 2) {
        return
      }
      retryTimer = setTimeout(() => void probeStatus(attempt + 1), 1000)
    }
    void probeStatus(0)
    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      isMountedRef.current = false
    }
  }, [loadStatus])

  useEffect(() => {
    if (!status?.busy || pendingAction || checking) {
      return
    }
    const timeout = setTimeout(() => void loadStatus(false), 1000)
    return () => clearTimeout(timeout)
  }, [status, pendingAction, checking, loadStatus])

  useEffect(() => {
    if (status?.checkedAt == null) {
      return
    }
    const intervalId = setInterval(() => {
      setRelativeTimeTick((value) => value + 1)
    }, 60 * 1000)
    return () => clearInterval(intervalId)
  }, [status?.checkedAt])

  const handleInstall = async (restore: boolean, targetVersion: string): Promise<boolean> => {
    if (pendingRef.current || !onBeginOperation()) {
      showDeckyToast({ title: 'DeckyZone', body: BUSY_NOTICE, severity: 'error' })
      return false
    }
    pendingRef.current = true
    statusGenerationRef.current += 1
    setPendingAction(restore ? 'restore' : 'update')
    try {
      const result = await onUpdateInputPlumber(restore, restore ? null : targetVersion)
      applyStatus(result.update)
      if (isMountedRef.current) {
        setCheckError(null)
      }
      showDeckyToast({
        title: 'DeckyZone',
        body: result.status.message || result.update.message || (result.ok
          ? restore ? 'SteamOS InputPlumber restored.' : 'InputPlumber updated.'
          : 'Could not update InputPlumber.'),
        severity: result.ok ? 'success' : 'error',
      })
      return true
    } catch {
      showDeckyToast({
        title: 'DeckyZone',
        body: restore ? 'Could not restore the SteamOS InputPlumber version.' : 'Could not update InputPlumber.',
        severity: 'error',
      })
      return false
    } finally {
      pendingRef.current = false
      onEndOperation()
      if (isMountedRef.current) {
        setPendingAction(null)
      }
    }
  }

  if (!status?.supported) {
    return null
  }

  const releaseCheckError = checkError ?? status.checkError
  const hasNewerVersion = Boolean(!releaseCheckError && status.activeVersion && status.latestVersion
    && status.updateAvailable && compareVersions(status.latestVersion, status.activeVersion) > 0)
  const busy = disabled || status.busy || checking || pendingAction !== null
  const updateText = (() => {
    if (pendingAction === 'restore') {
      return 'Restoring…'
    }
    if (pendingAction === 'update' || status.busy) {
      return 'Installing…'
    }
    if (checking) {
      return 'Checking for updates…'
    }
    if (releaseCheckError) {
      return 'Couldn’t check for updates'
    }
    if (!status.available) {
      return (status.message || 'Updating unavailable').replace(/\.$/, '')
    }
    if (!status.latestVersion || !status.activeVersion) {
      return 'Not checked yet'
    }
    if (hasNewerVersion) {
      return `Update available: ${status.latestVersion}`
    }
    if (compareVersions(status.latestVersion, status.activeVersion) < 0) {
      return 'Newer than latest release'
    }
    return status.checkedAt !== null
      ? `Up to date: last checked ${getLastCheckText(status.checkedAt)}`
      : 'Up to date'
  })()

  const openConfirmation = (restore: boolean) => {
    if (confirmationOpenRef.current || busy || (restore ? !status.canRestore : !status.available || !hasNewerVersion)) {
      return
    }
    const targetVersion = restore ? status.systemVersion : status.latestVersion
    if (!targetVersion) {
      return
    }
    confirmationOpenRef.current = true
    try {
      showModal(
        <InputPlumberUpdateConfirmation
          restore={restore}
          targetVersion={targetVersion}
          onConfirm={() => handleInstall(restore, targetVersion)}
        />,
        undefined,
        { fnOnClose: () => { confirmationOpenRef.current = false } },
      )
    } catch (error) {
      confirmationOpenRef.current = false
      throw error
    }
  }

  return (
    <>
      <SettingsRow>
        <SteamExplainerButtonItem
          layout={itemLayout}
          label="InputPlumber Update"
          description={updateText}
          explainerTitle="InputPlumber Update"
          explainer={UPDATE_EXPLAINER}
          disabled={busy || !status.available}
          onClick={() => hasNewerVersion ? openConfirmation(false) : void loadStatus(true)}
        >
          {pendingAction === 'update' ? 'Updating…'
            : checking ? 'Checking…'
              : hasNewerVersion ? `Update to ${status.latestVersion}` : 'Check for Updates'}
        </SteamExplainerButtonItem>
      </SettingsRow>
      {status.canRestore && (
        <SettingsRow>
          <SteamExplainerButtonItem
            layout={itemLayout}
            label="Restore SteamOS InputPlumber"
            description={`SteamOS: ${status.systemVersion ?? 'Unavailable'}`}
            explainerTitle="Restore SteamOS InputPlumber"
            explainer={RESTORE_EXPLAINER}
            disabled={busy || !status.systemVersion}
            onClick={() => openConfirmation(true)}
          >
            {pendingAction === 'restore' ? 'Restoring…' : 'Restore SteamOS InputPlumber'}
          </SteamExplainerButtonItem>
        </SettingsRow>
      )}
    </>
  )
}

export default InputPlumberUpdateControls
