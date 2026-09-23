import { callable } from '@decky/api'
import { ButtonItem, Field } from '@decky/ui'
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
import { SettingsRow, SettingsSection, useSettingsItemLayout } from './SettingsSurface'

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

  return (
    <SettingsSection title="Updates">
      {updateButtonText && (
        <SettingsRow>
          <ButtonItem layout={itemLayout} onClick={() => void handleUpdate()} disabled={isUpdating}>
            {isUpdating ? 'Installing...' : updateButtonText}
          </ButtonItem>
        </SettingsRow>
      )}
      <SettingsRow>
        <SteamExplainerButtonItem
          layout={itemLayout}
          onClick={() => void loadLatestVersion()}
          disabled={isLoadingLatestVersion || isUpdating}
          explainerTitle="Check Version"
          explainer={CHECK_VERSION_EXPLAINER}
          settingsDescription="Looks for updates"
          description={lastCheckTime ? `Last check: ${getLastCheckText(lastCheckTime)}` : undefined}
        >
          {isLoadingLatestVersion ? 'Checking...' : 'Check Version'}
        </SteamExplainerButtonItem>
      </SettingsRow>
      <SettingsRow>
        <Field focusable disabled label="Installed Version">
          {installedVersionNum || 'Unknown'}
        </Field>
      </SettingsRow>
      {Boolean(latestVersionNum) && (
        <SettingsRow>
          <Field focusable disabled label="Latest Version">
            {latestVersionNum}
          </Field>
        </SettingsRow>
      )}
    </SettingsSection>
  )
}

export default UpdatesPanel
