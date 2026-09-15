import { callable } from '@decky/api'
import { ButtonItem, Field, PanelSection, PanelSectionRow } from '@decky/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  checkLatestVersion,
  compareVersions,
  readVersionCache,
  recheckLatestVersion,
  type VersionCache,
} from '../utils/pluginUpdates'
import { useDeckyToastNotice } from '../utils/toasts'

const otaUpdate = callable<[], boolean>('ota_update')

type Props = {
  installedVersionNum: string
}

const getLastCheckText = (lastCheckTime: number): string => {
  const diff = Date.now() - lastCheckTime

  if (diff < 60 * 1000) {
    return 'just now'
  }

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }

  const days = Math.floor(diff / 86400000)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const UpdatesPanel = ({ installedVersionNum }: Props) => {
  const [latestVersionNum, setLatestVersionNum] = useState('')
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isLoadingLatestVersion, setIsLoadingLatestVersion] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const isMountedRef = useRef(true)

  const applyLatestVersion = (versionInfo: VersionCache) => {
    if (!isMountedRef.current) {
      return
    }

    setLatestVersionNum(versionInfo.latestVersionNum)
    setLastCheckTime(versionInfo.lastCheckTime)
  }

  useDeckyToastNotice(
    versionError
      ? {
          activeKey: `updates-version:${versionError}`,
          title: 'Updates',
          body: versionError,
          severity: 'error',
        }
      : null,
  )

  useDeckyToastNotice(
    updateError
      ? {
          activeKey: `updates-install:${updateError}`,
          title: 'Updates',
          body: updateError,
          severity: 'error',
        }
      : null,
  )

  const loadLatestVersion = async () => {
    setIsLoadingLatestVersion(true)
    setVersionError(null)
    try {
      applyLatestVersion(await recheckLatestVersion(installedVersionNum))
    } catch {
      if (!isMountedRef.current) {
        return
      }

      setVersionError('Failed to fetch latest version.')
    } finally {
      if (isMountedRef.current) {
        setIsLoadingLatestVersion(false)
      }
    }
  }

  useEffect(() => {
    const cachedVersionInfo = readVersionCache(installedVersionNum)
    if (cachedVersionInfo) {
      applyLatestVersion(cachedVersionInfo)
    }

    setIsLoadingLatestVersion(true)
    void checkLatestVersion(installedVersionNum)
      .then(applyLatestVersion)
      .catch(() => {
        // Background checks are best-effort; the manual button reports failures.
      })
      .finally(() => {
        if (isMountedRef.current) {
          setIsLoadingLatestVersion(false)
        }
      })

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const updateButtonText = useMemo(() => {
    if (!latestVersionNum) {
      return 'Reinstall Plugin'
    }

    const versionCompare = compareVersions(latestVersionNum, installedVersionNum)
    if (versionCompare > 0) {
      return `Update to ${latestVersionNum}`
    }
    if (versionCompare < 0) {
      return `Rollback to ${latestVersionNum}`
    }
    return 'Reinstall Plugin'
  }, [installedVersionNum, latestVersionNum])

  const handleUpdate = async () => {
    setIsUpdating(true)
    setUpdateError(null)
    try {
      const success = await otaUpdate()
      if (!success) {
        setUpdateError('Failed to install latest release.')
      }
    } catch {
      setUpdateError('Failed to install latest release.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <PanelSection title="Updates">
      <PanelSectionRow>
        <ButtonItem layout="below" onClick={() => void handleUpdate()} disabled={isUpdating || !latestVersionNum}>
          {isUpdating ? 'Installing...' : updateButtonText}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => void loadLatestVersion()}
          disabled={isLoadingLatestVersion || isUpdating}
          description={lastCheckTime ? `Last check: ${getLastCheckText(lastCheckTime)}` : 'Checks for the latest published version'}
        >
          {isLoadingLatestVersion ? 'Checking...' : 'Check Version'}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <Field focusable disabled label="Installed Version">
          {installedVersionNum || 'Unknown'}
        </Field>
      </PanelSectionRow>
      {Boolean(latestVersionNum) && (
        <PanelSectionRow>
          <Field focusable disabled label="Latest Version">
            {latestVersionNum}
          </Field>
        </PanelSectionRow>
      )}
    </PanelSection>
  )
}

export default UpdatesPanel
