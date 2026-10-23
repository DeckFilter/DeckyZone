import { Focusable, ProgressBar, updaterFieldClasses } from '@decky/ui'
import { useEffect, useState, type ComponentProps, type ComponentType } from 'react'
import { MINIMUM_APPLY_DURATION_MS, usePluginUpdateState } from '../utils/pluginUpdateStatus'

const FocusableUpdateStatus = Focusable as ComponentType<ComponentProps<typeof Focusable> & { focusable: boolean }>

const PluginUpdateProgress = () => {
  const { status, action, applyUntil } = usePluginUpdateState()
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (action !== 'prepare') return
    setNow(performance.now())
    const timer = setInterval(() => setNow(performance.now()), 1000)
    return () => clearInterval(timer)
  }, [action, applyUntil])

  const preparedProgress = status?.phase === 'downloading' && status.totalBytes
    ? Math.max(0, Math.min(100, Math.floor(status.downloadedBytes / status.totalBytes * 100)))
    : status?.phase === 'ready' && action === 'prepare' ? 100 : null
  // Apply completes after both preparation and the user's restart-choice window.
  const windowProgress = applyUntil === null ? 100
    : Math.max(0, Math.min(100, Math.floor((1 - (applyUntil - now) / MINIMUM_APPLY_DURATION_MS) * 100)))
  const progress = preparedProgress === null ? null : Math.min(preparedProgress, windowProgress)
  const remaining = action === 'prepare' && status?.phase === 'ready' && applyUntil !== null
    ? Math.max(0, Math.ceil((applyUntil - now) / 1000)) : null
  const timeRemaining = remaining === null ? ''
    : `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  const text = action === 'refresh' ? 'Checking update status…' : action === 'activate' || status?.phase === 'restarting'
    ? 'Restarting Decky Loader…'
    : `Applying${progress === null || progress === 0 ? '' : ` ${progress}%`}`

  // Reuse Steam's System updater status child inside the existing settings Field.
  return (
    <div className={updaterFieldClasses.UpdateStatusContainer}>
      <FocusableUpdateStatus focusable noFocusRing className={updaterFieldClasses.UpdaterFieldStatusApplying}>
        <div className={updaterFieldClasses.TextContainer}>
          <div className={updaterFieldClasses.TimeRemaining}>{timeRemaining}</div>
          <div className={updaterFieldClasses.ApplyingText}>{text}</div>
        </div>
        <ProgressBar nProgress={progress ?? 0} indeterminate={progress === null} nTransitionSec={0.3} />
      </FocusableUpdateStatus>
    </div>
  )
}

export default PluginUpdateProgress
