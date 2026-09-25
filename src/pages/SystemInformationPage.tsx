import { callable } from '@decky/api'
import {
  ButtonItem,
  ConfirmModal,
  DialogBody,
  DialogControlsSection,
  Field,
  Focusable,
  GamepadButton,
  type GamepadEvent,
  SidebarNavigation,
  SteamSpinner,
  showModal,
} from '@decky/ui'
import {
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'
import { FaCog, FaDesktop, FaGamepad, FaSlidersH, FaTachometerAlt } from 'react-icons/fa'
import ControllerPanel from '../components/ControllerPanel'
import DisplayPanel from '../components/DisplayPanel'
import ErrorBoundary from '../components/ErrorBoundary'
import InterfacePanel from '../components/InterfacePanel'
import LayoutPanel from '../components/LayoutPanel'
import PerformancePanel from '../components/PerformancePanel'
import SettingsDialogSubHeader from '../components/SettingsDialogSubHeader'
import TroubleshootingPanel, { type ResetPluginOutcome } from '../components/TroubleshootingPanel'
import UpdatesPanel from '../components/UpdatesPanel'
import {
  DECKYZONE_CONTROLLER_ROUTE,
  DECKYZONE_DISPLAY_ROUTE,
  DECKYZONE_GENERAL_ROUTE,
  DECKYZONE_INTERFACE_ROUTE,
  DECKYZONE_PERFORMANCE_ROUTE,
} from '../routes'
import { useDeckyZoneState } from '../state/DeckyZoneState'
import type { DebugInfoSnapshot, SystemReport } from '../types/plugin'
import { compareVersions } from '../utils/pluginUpdates'
import { showDeckyToast } from '../utils/toasts'

const getDebugInfo = callable<[], DebugInfoSnapshot>('get_debug_info')
const getSystemReport = callable<[], SystemReport>('get_support_report')
const saveSystemReport = callable<[string], SavedSystemReport>('save_support_report')
const FocusedConfirmModal = ConfirmModal as ComponentType<
  ComponentProps<typeof ConfirmModal> & { focusButton: 'primary' | 'secondary' }
>

type SavedSystemReport = {
  displayPath: string
  filename: string
}

type SnapshotRowProps = {
  label: string
  value: string
  bottomSeparator?: 'standard' | 'thick' | 'none'
}

type SnapshotPageProps = {
  snapshot: DebugInfoSnapshot | null
  error: string | null
  isLoading: boolean
  children: (snapshot: DebugInfoSnapshot) => ReactNode
}

type Props = {
  onResetPlugin: () => Promise<ResetPluginOutcome>
  onRetryBootstrap: () => void
}

type CopyState = 'idle' | 'success' | 'error'
type SaveState = 'idle' | 'saving' | 'success' | 'error'

const reportTextStyle = {
  boxSizing: 'border-box' as const,
  width: '100%',
  height: '221px',
  margin: '16px 0 0',
  padding: '15px',
  overflow: 'auto' as const,
  borderRadius: 0,
  background: 'rgb(64, 73, 87)',
  color: 'inherit',
  fontFamily: 'monospace',
  fontSize: '13px',
  lineHeight: '20px',
  whiteSpace: 'pre' as const,
  userSelect: 'text' as const,
}

const SnapshotRow = ({
  label,
  value,
  bottomSeparator = 'standard',
}: SnapshotRowProps) => {
  return (
    <Field
      focusable
      label={label}
      bottomSeparator={bottomSeparator}
      inlineWrap="keep-inline"
    >
      <span
        style={{
          display: 'block',
          overflowWrap: 'anywhere',
          textAlign: 'right',
        }}
      >
        {value}
      </span>
    </Field>
  )
}

const ErrorField = ({ message }: { message: string }) => {
  return (
    <DialogControlsSection>
      <Field focusable label="Error">
        <span style={{ color: 'red' }}>{message}</span>
      </Field>
    </DialogControlsSection>
  )
}

const formatValue = (value: string | null | undefined) => {
  return value ? value : 'Unavailable'
}

const formatGigabytes = (value: number | null | undefined) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return 'Unavailable'
  }

  const formattedValue = Number.isInteger(value)
    ? value.toFixed(0)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  return `${formattedValue} GB`
}

const formatControllerMode = (value: DebugInfoSnapshot['inputPlumber']['controllerMode'], available: boolean) => {
  if (!available) {
    return 'Unavailable'
  }

  if (value === null) {
    return 'Unknown'
  }

  return value === 'gamepad' ? 'Gamepad' : 'Desktop'
}

const formatDisplayProfile = (gamescope: DebugInfoSnapshot['gamescope']) => {
  if (gamescope.managedProfileInstalled) {
    return 'DeckyZone'
  }

  return gamescope.builtInAvailable ? 'Built in' : 'Unavailable'
}

const displayProfileNeedsAttention = (gamescope: DebugInfoSnapshot['gamescope']) => {
  return (
    gamescope.verificationState === 'unexpected' ||
    gamescope.verificationState === 'error' ||
    !gamescope.baseAssetAvailable ||
    !gamescope.greenTintAssetAvailable
  )
}

const copyTextToClipboard = async (text: string): Promise<boolean> => {
  // Steam UI does not consistently support navigator.clipboard.
  const element = document.createElement('pre')
  element.textContent = text
  element.style.position = 'fixed'
  element.style.left = '-9999px'
  element.style.top = '0'
  element.style.whiteSpace = 'pre'
  element.setAttribute('aria-hidden', 'true')
  document.body.appendChild(element)
  const selection = window.getSelection()
  const range = document.createRange()
  range.selectNodeContents(element)
  selection?.removeAllRanges()
  selection?.addRange(range)
  let successful = false
  try {
    successful = Boolean(selection) && document.execCommand('copy')
  } catch (error) {
    console.warn('[DeckyZone:SystemReport] SteamClient clipboard fallback failed', error)
  } finally {
    selection?.removeAllRanges()
    document.body.removeChild(element)
  }
  return successful
}

const useReportNavigation = () => {
  const reportTextRef = useRef<HTMLDivElement>(null)

  const handleReportNavigation = (event: GamepadEvent) => {
    const element = reportTextRef.current
    if (!element) {
      return
    }

    const direction = event.detail.button
    const isScrollingDown = direction === GamepadButton.DIR_DOWN
    const isScrollingUp = direction === GamepadButton.DIR_UP
    const canScrollDown = element.scrollTop + element.clientHeight < element.scrollHeight - 1
    const canScrollUp = element.scrollTop > 0

    if ((isScrollingDown && canScrollDown) || (isScrollingUp && canScrollUp)) {
      event.preventDefault()
      event.stopPropagation()
      element.scrollBy({
        top: isScrollingDown ? 120 : -120,
        behavior: 'smooth',
      })
      return
    }

    if (isScrollingDown) {
      const firstModalButton = element
        .closest('[role="dialog"]')
        ?.querySelector<HTMLButtonElement>('button')
      if (firstModalButton) {
        event.preventDefault()
        event.stopPropagation()
        firstModalButton.focus()
      }
    }
  }

  return { reportTextRef, handleReportNavigation }
}

type SystemReportModalProps = {
  closeModal?: () => void
  reportText: string
}

const SystemReportModal = ({ closeModal, reportText }: SystemReportModalProps) => {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveInFlightRef = useRef(false)
  const isMountedRef = useRef(true)
  const { reportTextRef, handleReportNavigation } = useReportNavigation()

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
      }
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const handleCopyReport = async () => {
    const didCopy = await copyTextToClipboard(reportText)
    if (!isMountedRef.current) {
      return
    }
    setCopyState(didCopy ? 'success' : 'error')
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
    }
    copyTimeoutRef.current = setTimeout(
      () => {
        setCopyState('idle')
        copyTimeoutRef.current = null
      },
      didCopy ? 2000 : 4000,
    )
  }

  const handleSaveReport = async () => {
    if (saveInFlightRef.current) {
      return
    }

    saveInFlightRef.current = true
    setSaveState('saving')
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    try {
      const savedReport = await saveSystemReport(reportText)
      showDeckyToast({
        title: 'System Report Saved',
        body: `Saved to ${savedReport.displayPath}`,
        severity: 'success',
      })
      if (!isMountedRef.current) {
        return
      }
      setSaveState('success')
      saveTimeoutRef.current = setTimeout(() => {
        setSaveState('idle')
        saveTimeoutRef.current = null
      }, 2500)
    } catch (error) {
      console.error('[DeckyZone:SystemReport] Failed to save report', error)
      showDeckyToast({
        title: 'Could Not Save Report',
        body: 'DeckyZone could not save the report to the desktop.',
        severity: 'error',
      })
      if (!isMountedRef.current) {
        return
      }
      setSaveState('error')
      saveTimeoutRef.current = setTimeout(() => {
        setSaveState('idle')
        saveTimeoutRef.current = null
      }, 4000)
    } finally {
      saveInFlightRef.current = false
    }
  }

  const copyButtonText = copyState === 'success'
    ? 'Copied'
    : copyState === 'error'
      ? 'Try Again'
      : 'Copy Report'
  const saveButtonText = saveState === 'saving'
    ? 'Saving…'
    : saveState === 'success'
      ? 'Saved'
      : saveState === 'error'
        ? 'Try Again'
        : 'Save to Desktop'

  return (
    <FocusedConfirmModal
      bAllowFullSize
      onCancel={closeModal}
      onEscKeypress={closeModal}
      onOK={() => void handleCopyReport()}
      onMiddleButton={() => void handleSaveReport()}
      strTitle="System Report"
      strDescription="DeckyZone has gathered recent logs and the following data for your system:"
      strOKButtonText={copyButtonText}
      strMiddleButtonText={saveButtonText}
      strCancelButtonText="Close"
      bMiddleDisabled={saveState === 'saving'}
      focusButton="primary"
    >
      <Focusable
        // @ts-expect-error Steam's runtime component supports an explicit focus target.
        focusable
        ref={reportTextRef}
        style={reportTextStyle}
        onGamepadDirection={handleReportNavigation}
        actionDescriptionMap={{
          [GamepadButton.DIR_UP]: 'Scroll Up',
          [GamepadButton.DIR_DOWN]: 'Scroll Down',
        }}
      >
        <pre style={{ margin: 0, font: 'inherit', whiteSpace: 'inherit' }}>{reportText}</pre>
      </Focusable>
    </FocusedConfirmModal>
  )
}

const SnapshotSection = ({
  snapshot,
  error,
  isLoading,
  title,
  children,
}: SnapshotPageProps & { title: string }) => {
  return (
    <>
      {isLoading && !snapshot && (
        <DialogControlsSection>
          <SettingsDialogSubHeader>{title}</SettingsDialogSubHeader>
          <SteamSpinner />
        </DialogControlsSection>
      )}
      {error && <ErrorField message={error} />}
      {snapshot && (
        <DialogControlsSection>
          <SettingsDialogSubHeader>{title}</SettingsDialogSubHeader>
          {children(snapshot)}
        </DialogControlsSection>
      )}
    </>
  )
}

const GeneralInformationSection = ({
  snapshot,
  error: snapshotError,
  isLoading: isSnapshotLoading,
  pluginVersion,
}: Omit<SnapshotPageProps, 'children'> & { pluginVersion: string }) => {
  const [reportError, setReportError] = useState<string | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const reportInFlightRef = useRef(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const handleCreateReport = async () => {
    if (reportInFlightRef.current) {
      return
    }

    reportInFlightRef.current = true
    setIsGeneratingReport(true)
    setReportError(null)

    try {
      const report = await getSystemReport()
      if (report.text && isMountedRef.current) {
        showModal(<SystemReportModal reportText={report.text} />)
      }
    } catch (error) {
      if (isMountedRef.current) {
        console.error('[DeckyZone:SystemReport] Failed to create report', error)
        setReportError("DeckyZone couldn't create the system report.")
      }
    } finally {
      reportInFlightRef.current = false
      if (isMountedRef.current) {
        setIsGeneratingReport(false)
      }
    }
  }

  return (
    <>
      {isSnapshotLoading && !snapshot && (
        <DialogControlsSection>
          <SettingsDialogSubHeader>System Information</SettingsDialogSubHeader>
          <SteamSpinner />
        </DialogControlsSection>
      )}
      {snapshotError && <ErrorField message={snapshotError} />}
      {snapshot && (
        <DialogControlsSection>
          <SettingsDialogSubHeader>System Information</SettingsDialogSubHeader>
          <SnapshotRow label="Product" value={formatValue(snapshot.deviceIdentity.productName)} />
          <SnapshotRow label="Operating System" value={formatValue(snapshot.osContext.prettyName)} />
          <SnapshotRow
            label="EC Firmware"
            value={formatValue(snapshot.firmware.ecVersion)}
          />
          <SnapshotRow
            label="Display Firmware"
            value={formatValue(snapshot.firmware.displayVersion)}
          />
          <SnapshotRow
            label="DeckyZone Version"
            value={formatValue(pluginVersion)}
            bottomSeparator="none"
          />
        </DialogControlsSection>
      )}

      {reportError && <ErrorField message={reportError} />}

      <DialogControlsSection>
        <SettingsDialogSubHeader>Support</SettingsDialogSubHeader>
        <ButtonItem
          layout="inline"
          label="System Report"
          disabled={isGeneratingReport}
          onClick={() => void handleCreateReport()}
        >
          {isGeneratingReport ? 'Generating…' : 'Create Report'}
        </ButtonItem>
      </DialogControlsSection>
    </>
  )
}

const ControllerInformationSection = (props: Omit<SnapshotPageProps, 'children'>) => {
  return (
    <SnapshotSection {...props} title="Information">
      {(snapshot) => (
        <>
          <SnapshotRow label="InputPlumber" value={formatValue(snapshot.inputPlumber.version)} />
          <SnapshotRow
            label="Profile"
            value={formatValue(snapshot.inputPlumber.profileName)}
          />
          <SnapshotRow
            label="Controller Mode"
            value={formatControllerMode(
              snapshot.inputPlumber.controllerMode,
              snapshot.inputPlumber.controllerModeAvailable,
            )}
          />
          <SnapshotRow
            label="Controller Status"
            value={formatValue(snapshot.inputPlumber.controllerRuntimeState)}
            bottomSeparator="none"
          />
        </>
      )}
    </SnapshotSection>
  )
}

const DisplayInformationSection = (props: Omit<SnapshotPageProps, 'children'>) => {
  return (
    <SnapshotSection {...props} title="Information">
      {(snapshot) => (
        <>
          <SnapshotRow label="Gamescope" value={formatValue(snapshot.gamescope.version)} />
          <SnapshotRow
            label="OLED Profile"
            value={formatDisplayProfile(snapshot.gamescope)}
            bottomSeparator={displayProfileNeedsAttention(snapshot.gamescope) ? 'standard' : 'none'}
          />
          {displayProfileNeedsAttention(snapshot.gamescope) && (
            <SnapshotRow label="Profile Status" value="Needs attention" bottomSeparator="none" />
          )}
        </>
      )}
    </SnapshotSection>
  )
}

const SystemInformationPage = ({ onResetPlugin, onRetryBootstrap }: Props) => {
  const { activeGame, bootstrap, settingsRevision, store, uiRevision } = useDeckyZoneState()
  const [snapshot, setSnapshot] = useState<DebugInfoSnapshot | null>(null)
  const [latestVersionNum, setLatestVersionNum] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const isMountedRef = useRef(true)
  const requestGenerationRef = useRef(0)

  useEffect(() => {
    isMountedRef.current = true
    const generation = ++requestGenerationRef.current
    const delay = snapshot ? 250 : 0
    const timeoutId = setTimeout(() => {
      setIsLoading(true)
      setError(null)
      void getDebugInfo()
        .then((nextSnapshot) => {
          if (isMountedRef.current && generation === requestGenerationRef.current) {
            setSnapshot(nextSnapshot)
          }
        })
        .catch((error) => {
          if (!isMountedRef.current || generation !== requestGenerationRef.current) {
            return
          }

          console.error('[DeckyZone:SystemInformation] Failed to load information', error)
          setError("DeckyZone couldn't load system information.")
        })
        .finally(() => {
          if (isMountedRef.current && generation === requestGenerationRef.current) {
            setIsLoading(false)
          }
        })
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [settingsRevision])

  useEffect(() => () => {
    isMountedRef.current = false
    requestGenerationRef.current += 1
  }, [])

  if (bootstrap.state === 'loading') {
    return (
      <DialogBody>
        <DialogControlsSection>
          <SteamSpinner />
        </DialogControlsSection>
      </DialogBody>
    )
  }

  if (bootstrap.state === 'error') {
    return (
      <DialogBody>
        <DialogControlsSection>
          <Field label="Error">
            <span style={{ color: 'red' }}>{bootstrap.message}</span>
          </Field>
          <ButtonItem layout="inline" onClick={onRetryBootstrap}>
            Retry
          </ButtonItem>
        </DialogControlsSection>
      </DialogBody>
    )
  }

  const { settings, status } = bootstrap.snapshot
  const installedVersionNum = settings.pluginVersionNum ?? ''
  const showReinstallPlugin = Boolean(latestVersionNum)
    && compareVersions(latestVersionNum, installedVersionNum) === 0

  const snapshotPageProps = { snapshot, error, isLoading }
  const applySettingsUpdate = (update: Parameters<typeof store.updateSettings>[0]) => {
    store.updateSettings(update)
  }

  return (
    <SidebarNavigation
      key={`deckyzone-settings:${uiRevision}`}
      pages={[
        {
          title: 'General',
          icon: <FaCog />,
          content: (
            <DialogBody>
              <ErrorBoundary title="Updates">
                <UpdatesPanel
                  installedVersionNum={installedVersionNum}
                  onLatestVersionChange={setLatestVersionNum}
                />
              </ErrorBoundary>
              <GeneralInformationSection
                {...snapshotPageProps}
                pluginVersion={installedVersionNum}
              />
              <ErrorBoundary title="Troubleshooting">
                <TroubleshootingPanel
                  onResetPlugin={onResetPlugin}
                  showOpenSettings={false}
                  showReinstallPlugin={showReinstallPlugin}
                />
              </ErrorBoundary>
              <ErrorBoundary title="Layout">
                <LayoutPanel settings={settings} onSettingsChange={applySettingsUpdate} />
              </ErrorBoundary>
            </DialogBody>
          ),
          route: DECKYZONE_GENERAL_ROUTE,
        },
        {
          title: 'Controller',
          icon: <FaGamepad />,
          content: (
            <DialogBody>
              <ErrorBoundary title="Controller">
                <ControllerPanel
                  activeGame={activeGame}
                  settings={settings}
                  status={status}
                  onSettingsChange={applySettingsUpdate}
                  onStatusChange={(nextStatus) => store.updateStatus(nextStatus)}
                />
              </ErrorBoundary>
              <ControllerInformationSection {...snapshotPageProps} />
            </DialogBody>
          ),
          route: DECKYZONE_CONTROLLER_ROUTE,
        },
        {
          title: 'Interface',
          icon: <FaSlidersH />,
          content: (
            <DialogBody>
              <ErrorBoundary title="Interface">
                <InterfacePanel settings={settings} onSettingsChange={applySettingsUpdate} />
              </ErrorBoundary>
            </DialogBody>
          ),
          route: DECKYZONE_INTERFACE_ROUTE,
        },
        {
          title: 'Display',
          icon: <FaDesktop />,
          content: (
            <DialogBody>
              <ErrorBoundary title="Display">
                <DisplayPanel settings={settings} onSettingsChange={applySettingsUpdate} />
              </ErrorBoundary>
              <DisplayInformationSection {...snapshotPageProps} />
            </DialogBody>
          ),
          route: DECKYZONE_DISPLAY_ROUTE,
        },
        {
          title: 'Performance',
          icon: <FaTachometerAlt />,
          content: (
            <DialogBody>
              <ErrorBoundary title="Performance">
                {error && <ErrorField message={error} />}
                <PerformancePanel
                  settings={settings}
                  settingsLeadingRows={(
                    <>
                      {isLoading && !snapshot && <SteamSpinner />}
                      {snapshot && (
                        <>
                          <SnapshotRow
                            label="System RAM"
                            value={formatGigabytes(snapshot.memory.systemRamGb)}
                          />
                          <SnapshotRow
                            label="Active VRAM"
                            value={formatGigabytes(snapshot.memory.activeVramGb)}
                          />
                        </>
                      )}
                    </>
                  )}
                  onSettingsChange={applySettingsUpdate}
                />
              </ErrorBoundary>
            </DialogBody>
          ),
          route: DECKYZONE_PERFORMANCE_ROUTE,
        },
      ]}
    />
  )
}

export default SystemInformationPage
