import { Focusable, ProgressBar, updaterFieldClasses } from '@decky/ui'
import type { ComponentProps, ComponentType } from 'react'
import { usePluginUpdateState } from '../utils/pluginUpdateStatus'

const FocusableUpdateStatus = Focusable as ComponentType<ComponentProps<typeof Focusable> & { focusable: boolean }>

const PluginUpdateProgress = () => {
  const { status, action } = usePluginUpdateState()
  const progress = status?.phase === 'downloading' && status.totalBytes
    ? Math.max(0, Math.min(100, Math.floor(status.downloadedBytes / status.totalBytes * 100)))
    : null
  const text = action === 'refresh' ? 'Checking update status…' : action === 'activate' || status?.phase === 'restarting'
    ? 'Restarting Decky Loader…'
    : status?.phase === 'downloading'
      ? `Downloading${progress === null ? '…' : ` ${progress}%`}`
      : status?.phase === 'staging' ? 'Preparing update…' : 'Checking release…'

  // Reuse Steam's System updater status child inside the existing settings Field.
  return (
    <div className={updaterFieldClasses.UpdateStatusContainer}>
      <FocusableUpdateStatus focusable noFocusRing className={updaterFieldClasses.UpdaterFieldStatusApplying}>
        <div className={updaterFieldClasses.TextContainer}>
          <div className={updaterFieldClasses.ApplyingText}>{text}</div>
        </div>
        <ProgressBar nProgress={progress ?? 0} indeterminate={progress === null} nTransitionSec={0.3} />
      </FocusableUpdateStatus>
    </div>
  )
}

export default PluginUpdateProgress
