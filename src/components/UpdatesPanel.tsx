import { callable } from '@decky/api'
import { DialogButton, Field } from '@decky/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  checkLatestVersion,
  compareVersions,
  readVersionCache,
  recheckLatestVersion,
  type VersionCache,
} from '../utils/pluginUpdates'
import { useDeckyToastNotice } from '../utils/toasts'
import { SteamExplainerButtonItem } from './SteamExplainer'
import { SettingsRow, SettingsSection, useSettingsItemLayout, useSettingsSurface } from './SettingsSurface'

const otaUpdate = callable<[], boolean>('ota_update')
const CHECK_VERSION_EXPLAINER = 'Checks GitHub for the latest published DeckyZone release.'

type Props = {
  installedVersionNum: string
  onLatestVersionChange: (latestVersionNum: string) => void
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

const UpdatesPanel = ({ installedVersionNum, onLatestVersionChange }: Props) => {
  const itemLayout = useSettingsItemLayout()
  const surface = useSettingsSurface()
  const [latestVersionNum, setLatestVersionNum] = useState('')
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isLoadingLatestVersion, setIsLoadingLatestVersion] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [relativeTimeTick, setRelativeTimeTick] = useState(0)
  const isMountedRef = useRef(true)

  const applyLatestVersion = (versionInfo: VersionCache) => {
    if (!isMountedRef.current) {
      return
    }

    setLatestVersionNum(versionInfo.latestVersionNum)
    setLastCheckTime(versionInfo.lastCheckTime)
    onLatestVersionChange(versionInfo.latestVersionNum)
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
        if (isMountedRef.current) {
          setVersionError('Failed to fetch latest version.')
        }
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

  useEffect(() => {
    if (lastCheckTime === null) {
      return
    }

    const intervalId = setInterval(() => {
      setRelativeTimeTick((value) => value + 1)
    }, 60 * 1000)

    return () => clearInterval(intervalId)
  }, [lastCheckTime])

  const updateButtonText = useMemo(() => {
    if (!latestVersionNum) {
      return null
    }

    const versionCompare = compareVersions(latestVersionNum, installedVersionNum)
    if (versionCompare > 0) {
      return `Update to ${latestVersionNum}`
    }
    if (versionCompare < 0) {
      return `Rollback to ${latestVersionNum}`
    }
    return null
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

  const updateStatusText = useMemo(() => {
    if (isLoadingLatestVersion) {
      return 'Checking for updates…'
    }

    if (versionError) {
      return 'Couldn’t check for updates'
    }

    if (!latestVersionNum) {
      return 'Not checked yet'
    }

    const versionCompare = compareVersions(latestVersionNum, installedVersionNum)
    if (versionCompare > 0) {
      return `Update available: ${latestVersionNum}`
    }

    if (versionCompare < 0) {
      return 'Newer than latest release'
    }

    return lastCheckTime
      ? `Up to date: last checked ${getLastCheckText(lastCheckTime)}`
      : 'Up to date'
  }, [
    installedVersionNum,
    isLoadingLatestVersion,
    lastCheckTime,
    latestVersionNum,
    relativeTimeTick,
    versionError,
  ])

  const actionText = isUpdating
    ? 'Installing…'
    : isLoadingLatestVersion
      ? 'Checking…'
      : versionError
        ? 'Check for Updates'
        : updateButtonText ?? 'Check for Updates'
  const actionDisabled = isLoadingLatestVersion || isUpdating
  const handleAction = () => {
    if (updateButtonText && !versionError) {
      void handleUpdate()
      return
    }

    void loadLatestVersion()
  }

  return (
    <SettingsSection title="Updates">
      <SettingsRow>
        {surface === 'settings' ? (
          <Field
            label="Software Updates"
            description={updateStatusText}
            childrenContainerWidth="fixed"
          >
            <DialogButton disabled={actionDisabled} onClick={handleAction}>
              {actionText}
            </DialogButton>
          </Field>
        ) : (
          <SteamExplainerButtonItem
            layout={itemLayout}
            label="Software Updates"
            onClick={handleAction}
            disabled={actionDisabled}
            explainerTitle="Software Updates"
            explainer={CHECK_VERSION_EXPLAINER}
            description={updateStatusText}
          >
            {actionText}
          </SteamExplainerButtonItem>
        )}
      </SettingsRow>
    </SettingsSection>
  )
}

export default UpdatesPanel
