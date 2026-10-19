import { callable } from '@decky/api'
import { DialogButton, Field, IconsModule } from '@decky/ui'
import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import type { PluginSettingsUpdate } from '../state/DeckyZoneState'
import type { PluginSettings, ReleaseTarget, UpdateChannel } from '../types/plugin'
import {
  checkLatestVersion,
  compareVersions,
  getLastCheckText,
  isValidVersion,
  readVersionCache,
  recheckLatestVersion,
  resetStartupCheck,
  type VersionCache,
} from '../utils/pluginUpdates'
import { resetReleaseNotesCache } from '../utils/releaseNotes'
import { beginUpdateOperation, useUpdateOperationBusy } from '../utils/updateOperations'
import { useDeckyToastNotice } from '../utils/toasts'
import { showReleaseNotesModal } from './ReleaseNotesModal'
import ReleaseNotesPreview from './ReleaseNotesPreview'
import { SettingsRow, SettingsSection, useSettingsItemLayout, useSettingsSurface } from './SettingsSurface'
import { SteamExplainerDropdownItem } from './SteamExplainer'

const otaUpdate = callable<[UpdateChannel, ReleaseTarget], boolean>('ota_update')
const setUpdateChannel = callable<[UpdateChannel], PluginSettings>('set_update_channel')
const UpdateAvailableIcon = IconsModule?.FieldYellowExclamation as ComponentType | undefined
const CHANNEL_OPTIONS = [
  { data: 'stable' as const, label: 'Stable' },
  { data: 'prerelease' as const, label: 'Pre-release' },
]
const normalizeChannel = (channel: unknown): UpdateChannel => channel === 'prerelease' ? 'prerelease' : 'stable'

type Props = {
  settings: PluginSettings
  onSettingsChange: (update: PluginSettingsUpdate) => void
  onReleaseChange: (release: ReleaseTarget | null, channel: UpdateChannel) => void
  onBusyChange?: (busy: boolean) => void
  disabled?: boolean
}

const UpdatesPanel = ({ settings, onSettingsChange, onReleaseChange, onBusyChange, disabled = false }: Props) => {
  const installedVersionNum = settings.pluginVersionNum ?? ''
  const itemLayout = useSettingsItemLayout()
  const surface = useSettingsSurface()
  const operationBusy = useUpdateOperationBusy()
  const [channelValue, setChannelValue] = useState(() => normalizeChannel(settings.updateChannel))
  const [savedChannel, setSavedChannel] = useState(channelValue)
  const [release, setRelease] = useState<ReleaseTarget | null>(null)
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [channelError, setChannelError] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [isSavingChannel, setIsSavingChannel] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [checkRevision, setCheckRevision] = useState(0)
  const [relativeTimeTick, setRelativeTimeTick] = useState(0)
  const mounted = useRef(true)
  const saving = useRef(false)
  const installing = useRef(false)
  const channelRef = useRef(channelValue)
  const requestVersion = useRef(0)
  const checking = useRef<number | null>(null)
  const refs = useRef({ settings, onSettingsChange, onReleaseChange, onBusyChange, disabled })
  refs.current = { settings, onSettingsChange, onReleaseChange, onBusyChange, disabled }

  // Match the controller settings transaction: merge only the field owned by this control.
  const publishChannel = (channel: UpdateChannel) => {
    refs.current.onSettingsChange((current) => {
      const next = { ...current, updateChannel: channel }
      refs.current.settings = next
      return next
    })
  }

  const clearRelease = (channel: UpdateChannel) => {
    requestVersion.current += 1
    checking.current = null
    setRelease(null)
    setLastCheckTime(null)
    setVersionError(null)
    setIsChecking(false)
    refs.current.onReleaseChange(null, channel)
  }

  const applyRelease = (info: VersionCache, token: number) => {
    if (!mounted.current || token !== requestVersion.current || info.channel !== channelRef.current
      || info.installedVersionNum !== (refs.current.settings.pluginVersionNum ?? '')) return
    setRelease(info.release)
    setLastCheckTime(info.lastCheckTime)
    refs.current.onReleaseChange(info.release, info.channel)
  }

  const loadRelease = async (channel: UpdateChannel, version: string, force = false) => {
    const token = ++requestVersion.current
    checking.current = token
    setIsChecking(true)
    setVersionError(null)
    try {
      const result = await (force ? recheckLatestVersion(version, channel) : checkLatestVersion(version, channel))
      applyRelease(result, token)
    } catch {
      if (mounted.current && token === requestVersion.current) {
        setRelease(null)
        refs.current.onReleaseChange(null, channel)
        setVersionError('Couldn’t check for updates. Try again.')
      }
    } finally {
      if (mounted.current && token === requestVersion.current) {
        checking.current = null
        setIsChecking(false)
      }
    }
  }

  useDeckyToastNotice(versionError ? {
    activeKey: `updates-version:${savedChannel}:${versionError}`, title: 'Updates', body: versionError, severity: 'error',
  } : null)
  useDeckyToastNotice(updateError ? {
    activeKey: `updates-install:${updateError}`, title: 'Updates', body: updateError, severity: 'error',
  } : null)
  useDeckyToastNotice(channelError ? {
    activeKey: `updates-channel:${channelError}`, title: 'Updates', body: channelError, severity: 'error',
  } : null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      requestVersion.current += 1
      refs.current.onBusyChange?.(false)
    }
  }, [])

  useEffect(() => {
    if (saving.current) return
    const next = normalizeChannel(settings.updateChannel)
    if (channelRef.current !== next) {
      clearRelease(next)
      channelRef.current = next
      setChannelValue(next)
      setSavedChannel(next)
    }
  }, [settings.updateChannel])

  useEffect(() => {
    if (operationBusy || isSavingChannel || savedChannel !== channelRef.current
      || savedChannel !== normalizeChannel(settings.updateChannel) || !isValidVersion(installedVersionNum)) return
    clearRelease(savedChannel)
    const token = requestVersion.current
    const cached = readVersionCache(installedVersionNum, savedChannel)
    if (cached) applyRelease(cached, token)
    void loadRelease(savedChannel, installedVersionNum)
    return () => { requestVersion.current += 1 }
  }, [installedVersionNum, savedChannel, isSavingChannel, operationBusy, checkRevision])

  useEffect(() => {
    if (lastCheckTime === null) return
    const timer = setInterval(() => setRelativeTimeTick((value) => value + 1), 60000)
    return () => clearInterval(timer)
  }, [lastCheckTime])

  const handleChannelChange = async (next: UpdateChannel) => {
    if (saving.current || installing.current || refs.current.disabled || next === channelRef.current) return
    const releaseOperation = beginUpdateOperation()
    if (!releaseOperation) return
    const previous = normalizeChannel(refs.current.settings.updateChannel)
    try {
      saving.current = true
      refs.current.onBusyChange?.(true)
      channelRef.current = next
      setChannelValue(next)
      setIsSavingChannel(true)
      setChannelError(null)
      setUpdateError(null)
      clearRelease(next)
      publishChannel(next)
      const authoritative = await setUpdateChannel(next)
      const saved = normalizeChannel(authoritative.updateChannel)
      // A mounted sibling surface can have changed other fields while this request was pending.
      publishChannel(saved)
      resetStartupCheck()
      resetReleaseNotesCache()
      if (mounted.current) {
        channelRef.current = saved
        setChannelValue(saved)
        setSavedChannel(saved)
        setCheckRevision((value) => value + 1)
      }
    } catch {
      publishChannel(previous)
      if (mounted.current) {
        channelRef.current = previous
        setChannelValue(previous)
        setSavedChannel(previous)
        setChannelError('Couldn’t save the update channel. Try again.')
      }
    } finally {
      saving.current = false
      releaseOperation()
      refs.current.onBusyChange?.(false)
      if (mounted.current) setIsSavingChannel(false)
    }
  }

  const updateButtonText = useMemo(() => {
    if (!release || !isValidVersion(installedVersionNum)) return null
    const comparison = compareVersions(release.version, installedVersionNum)
    if (comparison > 0) return `Update to ${release.version}`
    if (comparison < 0 && savedChannel === 'stable' && installedVersionNum.includes('-pre.')) {
      return `Install stable ${release.version}`
    }
    return null
  }, [installedVersionNum, release, savedChannel])

  const handleUpdate = async () => {
    if (!release || saving.current || installing.current || checking.current !== null || refs.current.disabled) return
    const releaseOperation = beginUpdateOperation()
    if (!releaseOperation) return
    const target = release
    const channel = savedChannel
    try {
      installing.current = true
      refs.current.onBusyChange?.(true)
      setIsUpdating(true)
      setUpdateError(null)
      if (!(await otaUpdate(channel, target))) throw new Error('Installation failed')
    } catch {
      if (mounted.current) {
        clearRelease(channelRef.current)
        resetStartupCheck()
        setUpdateError('Couldn’t install this release. Check for updates and try again.')
      }
    } finally {
      installing.current = false
      releaseOperation()
      refs.current.onBusyChange?.(false)
      if (mounted.current) setIsUpdating(false)
    }
  }

  const updateStatusText = useMemo(() => {
    if (isSavingChannel) return 'Saving update channel…'
    if (isChecking) return 'Checking for updates…'
    if (versionError) return 'Couldn’t check for updates'
    if (updateButtonText) return undefined
    if (!lastCheckTime) return 'Not checked yet'
    if (!release) return 'No releases available for this channel'
    if (compareVersions(release.version, installedVersionNum) < 0) return 'Newer than the latest release'
    return `Up to date: last checked ${getLastCheckText(lastCheckTime)}`
  }, [isSavingChannel, isChecking, lastCheckTime, release, installedVersionNum, relativeTimeTick, updateButtonText, versionError])

  const actionText = isUpdating ? 'Installing…' : isSavingChannel ? 'Saving…' : isChecking ? 'Checking…'
    : updateButtonText ?? 'Check for Updates'
  const actionDisabled = disabled || operationBusy || isChecking || isUpdating || isSavingChannel || !isValidVersion(installedVersionNum)
  const handleAction = () => {
    if (saving.current || installing.current || checking.current !== null || refs.current.disabled) return
    if (updateButtonText && !versionError) void handleUpdate()
    else void loadRelease(savedChannel, installedVersionNum, true)
  }

  return (
    <>
      <SettingsSection title="Updates">
        <SettingsRow>
          <Field
            label="Software Updates"
            icon={updateButtonText && UpdateAvailableIcon ? <UpdateAvailableIcon /> : undefined}
            description={updateStatusText}
            childrenLayout={itemLayout}
            childrenContainerWidth={surface === 'settings' ? 'fixed' : 'max'}
            onOptionsButton={() => showReleaseNotesModal(installedVersionNum, savedChannel)}
            onOptionsActionDescription="View Changelog"
          >
            <DialogButton disabled={actionDisabled} onClick={handleAction}>{actionText}</DialogButton>
          </Field>
        </SettingsRow>
        {updateButtonText && release && (
          <SettingsRow>
            <ReleaseNotesPreview target={release} channel={savedChannel} installedVersionNum={installedVersionNum} />
          </SettingsRow>
        )}
      </SettingsSection>
      <SettingsSection title="Beta Participation">
        <SettingsRow>
          <SteamExplainerDropdownItem
            controlled
            layout="below"
            label="Update Channel"
            menuLabel="Update Channel"
            explainerTitle="Update Channel"
            explainer="Stable receives regular releases. Pre-release includes early builds for testing and feedback. Selecting a channel checks for releases; install the offered version to change your installed build."
            rgOptions={CHANNEL_OPTIONS}
            selectedOption={channelValue}
            strDefaultLabel={CHANNEL_OPTIONS.find((option) => option.data === channelValue)?.label ?? 'Stable'}
            disabled={disabled || operationBusy || isSavingChannel || isUpdating}
            onChange={(option: { data: UpdateChannel }) => { void handleChannelChange(option.data) }}
          />
        </SettingsRow>
      </SettingsSection>
    </>
  )
}

export default UpdatesPanel
