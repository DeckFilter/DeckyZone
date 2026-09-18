import { callable } from '@decky/api'
import {
  ButtonItem,
  DialogBody,
  DialogControlsSection,
  Field,
  SidebarNavigation,
  SteamSpinner,
  gamepadDialogClasses,
} from '@decky/ui'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import {
  DECKYZONE_DISPLAY_ROUTE,
  DECKYZONE_INPUT_ROUTE,
  DECKYZONE_OVERVIEW_ROUTE,
  DECKYZONE_SUPPORT_REPORT_ROUTE,
} from '../routes'
import type { DebugInfoSnapshot, SupportReport } from '../types/plugin'

const getDebugInfo = callable<[], DebugInfoSnapshot>('get_debug_info')
const getSupportReport = callable<[], SupportReport>('get_support_report')

type SnapshotRowProps = {
  label: string
  value: string
  description?: ReactNode
  bottomSeparator?: 'standard' | 'thick' | 'none'
}

type PathDetailsProps = {
  paths: string[]
}

type SnapshotPageProps = {
  snapshot: DebugInfoSnapshot | null
  error: string | null
  isLoading: boolean
  children: (snapshot: DebugInfoSnapshot) => ReactNode
}

type CopyState = 'idle' | 'success' | 'error'

const pathListStyle = {
  display: 'grid',
  gap: '6px',
}

const pathTextStyle = {
  fontFamily: 'monospace',
  whiteSpace: 'nowrap' as const,
  display: 'inline-block',
}

const reportTextStyle = {
  boxSizing: 'border-box' as const,
  width: '100%',
  maxHeight: '46vh',
  margin: 0,
  padding: '12px',
  overflow: 'auto' as const,
  borderRadius: '2px',
  background: 'rgba(0, 0, 0, 0.28)',
  color: 'inherit',
  fontFamily: 'monospace',
  fontSize: '12px',
  lineHeight: 1.4,
  whiteSpace: 'pre-wrap' as const,
  overflowWrap: 'anywhere' as const,
  userSelect: 'text' as const,
}

const PathText = ({ path }: { path: string }) => {
  return (
    <div className={gamepadDialogClasses.FieldDescription}>
      <span style={pathTextStyle}>{path}</span>
    </div>
  )
}

const SnapshotRow = ({ label, value, description, bottomSeparator = 'standard' }: SnapshotRowProps) => {
  return (
    <Field label={label} highlightOnFocus={false} description={description} bottomSeparator={bottomSeparator}>
      {value}
    </Field>
  )
}

const PathDetails = ({ paths }: PathDetailsProps) => {
  return (
    <div style={pathListStyle}>
      {paths.map((path) => (
        <PathText key={path} path={path} />
      ))}
    </div>
  )
}

const formatValue = (value: string | null | undefined) => {
  return value ? value : 'Unavailable'
}

const formatBoolean = (value: boolean) => {
  return value ? 'Yes' : 'No'
}

const formatPresence = (value: string | null | undefined) => {
  return value ? 'Available' : 'Unavailable'
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

const isVerificationHealthy = (value: string | null | undefined) => {
  const normalized = (value ?? '').trim().toLowerCase()
  return normalized === 'ok' || normalized === 'healthy' || normalized === 'verified'
}

const renderPathDescription = (path: string | null | undefined) => {
  return path ? <PathText path={path} /> : undefined
}

const SnapshotPage = ({ snapshot, error, isLoading, children }: SnapshotPageProps) => {
  return (
    <DialogBody>
      {isLoading && !snapshot && <SteamSpinner />}
      {error && <div style={{ color: 'red', marginBottom: snapshot ? '12px' : 0 }}>{error}</div>}
      {snapshot && <DialogControlsSection>{children(snapshot)}</DialogControlsSection>}
    </DialogBody>
  )
}

const OverviewPage = (props: Omit<SnapshotPageProps, 'children'>) => {
  return (
    <SnapshotPage {...props}>
      {(snapshot) => (
        <>
          <SnapshotRow label="Product" value={formatValue(snapshot.deviceIdentity.productName)} />
          <SnapshotRow label="Board" value={formatValue(snapshot.deviceIdentity.boardName)} />
          <SnapshotRow label="Distro" value={formatValue(snapshot.osContext.prettyName)} />
          <SnapshotRow label="Kernel" value={formatValue(snapshot.osContext.kernelRelease)} />
          <SnapshotRow label="InputPlumber Version" value={formatValue(snapshot.inputPlumber.version)} />
          <SnapshotRow label="Gamescope Version" value={formatValue(snapshot.gamescope.version)} />
          <SnapshotRow
            label="Controller Runtime State"
            value={formatValue(snapshot.inputPlumber.controllerRuntimeState)}
          />
          <SnapshotRow
            label="DeckyZone Status"
            value={formatValue(snapshot.deckyZoneStatus.message)}
            bottomSeparator="none"
          />
        </>
      )}
    </SnapshotPage>
  )
}

const InputPage = (props: Omit<SnapshotPageProps, 'children'>) => {
  return (
    <SnapshotPage {...props}>
      {(snapshot) => (
        <>
          <SnapshotRow label="Available" value={formatBoolean(snapshot.inputPlumber.available)} />
          <SnapshotRow
            label="Profile Name"
            value={formatValue(snapshot.inputPlumber.profileName)}
            description={renderPathDescription(snapshot.inputPlumber.profilePath)}
          />
          <SnapshotRow
            label="Controller Mode"
            value={formatControllerMode(
              snapshot.inputPlumber.controllerMode,
              snapshot.inputPlumber.controllerModeAvailable,
            )}
          />
          <SnapshotRow
            label="Mode Interface Available"
            value={formatBoolean(snapshot.inputPlumber.controllerModeAvailable)}
          />
          <SnapshotRow
            label="Target Gamepad Present"
            value={formatBoolean(snapshot.inputPlumber.targetGamepadPresent)}
            description={renderPathDescription(snapshot.inputPlumber.targetGamepadPath)}
          />
          <SnapshotRow
            label="InputPlumber Keyboard Present"
            value={formatBoolean(snapshot.inputPlumber.keyboardPresent)}
            description={renderPathDescription(snapshot.inputPlumber.keyboardPath)}
          />
          <SnapshotRow
            label="Gyro Fix Built In"
            value={formatBoolean(snapshot.inputPlumber.gyroMountMatrixFix.builtIn)}
            description={<PathText path={snapshot.inputPlumber.gyroMountMatrixFix.systemPath} />}
          />
          <SnapshotRow
            label="Gyro Fix Override"
            value={snapshot.inputPlumber.gyroMountMatrixFix.enabled ? 'Enabled' : 'Disabled'}
            description={<PathText path={snapshot.inputPlumber.gyroMountMatrixFix.managedPath} />}
          />
          <SnapshotRow
            label="Zotac HID Driver Loaded"
            value={formatBoolean(snapshot.zotacZoneKernelDrivers.zotacZoneHidLoaded)}
            description={<PathText path={snapshot.zotacZoneKernelDrivers.zotacZoneHidPath} />}
          />
          <SnapshotRow
            label="Zotac Platform Driver Loaded"
            value={formatBoolean(snapshot.zotacZoneKernelDrivers.zotacZonePlatformLoaded)}
            description={<PathText path={snapshot.zotacZoneKernelDrivers.zotacZonePlatformPath} />}
          />
          <SnapshotRow
            label="Zotac HID sysfs config node"
            value={formatPresence(snapshot.zotacZoneKernelDrivers.hidConfigNodePath)}
            description={renderPathDescription(snapshot.zotacZoneKernelDrivers.hidConfigNodePath)}
          />
          <SnapshotRow
            label="Controller Runtime State"
            value={formatValue(snapshot.inputPlumber.controllerRuntimeState)}
            bottomSeparator="none"
          />
        </>
      )}
    </SnapshotPage>
  )
}

const DisplayPage = (props: Omit<SnapshotPageProps, 'children'>) => {
  return (
    <SnapshotPage {...props}>
      {(snapshot) => (
        <>
          <SnapshotRow
            label="Built-in Profile"
            value={formatBoolean(snapshot.gamescope.builtInAvailable)}
            description={
              !snapshot.gamescope.builtInAvailable && snapshot.gamescope.builtInCandidatePaths.length > 0 ? (
                <PathDetails paths={snapshot.gamescope.builtInCandidatePaths} />
              ) : undefined
            }
          />
          <SnapshotRow
            label="Managed Profile"
            value={formatBoolean(snapshot.gamescope.managedProfileInstalled)}
            description={
              !snapshot.gamescope.managedProfileInstalled ? (
                <PathDetails paths={[snapshot.gamescope.managedProfilePath]} />
              ) : undefined
            }
          />
          <SnapshotRow label="Green Tint Fix" value={formatBoolean(snapshot.gamescope.greenTintFixEnabled)} />
          <SnapshotRow
            label="Verification State"
            value={formatValue(snapshot.gamescope.verificationState)}
            description={
              !isVerificationHealthy(snapshot.gamescope.verificationState) ||
              !snapshot.gamescope.baseAssetAvailable ||
              !snapshot.gamescope.greenTintAssetAvailable ? (
                <PathDetails
                  paths={[
                    ...(!snapshot.gamescope.baseAssetAvailable ? [snapshot.gamescope.baseAssetPath] : []),
                    ...(!snapshot.gamescope.greenTintAssetAvailable
                      ? [snapshot.gamescope.greenTintAssetPath]
                      : []),
                  ]}
                />
              ) : undefined
            }
            bottomSeparator="none"
          />
        </>
      )}
    </SnapshotPage>
  )
}

const SupportReportPage = () => {
  const [report, setReport] = useState<SupportReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const isMountedRef = useRef(true)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadSupportReport = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const nextReport = await getSupportReport()
      if (!isMountedRef.current) {
        return
      }

      setReport(nextReport)
    } catch (error) {
      if (!isMountedRef.current) {
        return
      }

      setError(`Failed to generate support report: ${String(error)}`)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    void loadSupportReport()

    return () => {
      isMountedRef.current = false
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = null
      }
    }
  }, [])

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    // Steam UI does not consistently support navigator.clipboard.
    const element = document.createElement('textarea')
    element.value = text
    element.style.position = 'absolute'
    element.style.opacity = '0'
    element.style.right = '-999px'
    document.body.appendChild(element)
    element.focus()
    element.select()
    let successful = false
    try {
      successful = document.execCommand('copy')
    } catch (error) {
      console.warn('[DeckyZone:SupportReport] SteamClient clipboard fallback failed', error)
    } finally {
      document.body.removeChild(element)
    }
    return successful
  }

  const handleCopyReport = async () => {
    if (!report?.text) {
      return
    }

    const didCopy = await copyTextToClipboard(report.text)
    if (!isMountedRef.current) {
      return
    }

    setCopyState(didCopy ? 'success' : 'error')
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = null
    }
    copyTimeoutRef.current = setTimeout(
      () => {
        if (isMountedRef.current) {
          setCopyState('idle')
        }
        copyTimeoutRef.current = null
      },
      didCopy ? 2000 : 4000,
    )
  }

  const copyDescription = copyState === 'success'
    ? 'Report copied to the clipboard'
    : copyState === 'error'
      ? 'Copy failed. Keep the Decky window focused and try again'
      : report
        ? 'Copies the complete report as text'
        : 'Generate a report before copying'

  return (
    <DialogBody>
      {isLoading && !report && <SteamSpinner />}
      {error && <div style={{ color: 'red', marginBottom: report ? '12px' : 0 }}>{error}</div>}
      {report && (
        <DialogControlsSection>
          <Field
            label="Local Support Report"
            description="Generated locally. Common identifiers are redacted, but review it before sharing. Nothing is uploaded. Recent DeckyZone logs may be included."
            highlightOnFocus={false}
          />
          <SnapshotRow label="DeckyZone" value={formatValue(report.summary.pluginVersion)} />
          <SnapshotRow label="Decky Loader" value={formatValue(report.summary.deckyVersion)} />
          <SnapshotRow label="Operating System" value={formatValue(report.summary.os)} />
          <SnapshotRow label="Kernel" value={formatValue(report.summary.kernel)} />
          <SnapshotRow label="VRAM" value={formatValue(report.summary.vram)} />
          <SnapshotRow label="Battery Time" value={formatValue(report.summary.battery)} />
          <SnapshotRow label="Generated" value={formatValue(report.generatedAt)} />
          <SnapshotRow label="Recent Log Included" value={formatBoolean(report.logIncluded)} />
          <SnapshotRow label="Report Truncated" value={formatBoolean(report.truncated)} bottomSeparator="none" />
        </DialogControlsSection>
      )}

      <DialogControlsSection>
        <ButtonItem
          layout="below"
          disabled={isLoading}
          description={isLoading ? 'Refreshing report' : 'Collect current diagnostics and recent logs'}
          onClick={() => void loadSupportReport()}
        >
          Refresh
        </ButtonItem>
        <ButtonItem
          layout="below"
          disabled={!report?.text}
          description={copyDescription}
          onClick={() => void handleCopyReport()}
        >
          Copy Report
        </ButtonItem>
      </DialogControlsSection>

      {report && (
        <DialogControlsSection>
          <Field label="Full Report" highlightOnFocus={false} childrenLayout="below">
            <pre style={reportTextStyle} tabIndex={0}>{report.text}</pre>
          </Field>
        </DialogControlsSection>
      )}
    </DialogBody>
  )
}

const DebugInfoPage = () => {
  const [snapshot, setSnapshot] = useState<DebugInfoSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    const loadDebugInfo = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const nextSnapshot = await getDebugInfo()
        if (!isMountedRef.current) {
          return
        }

        setSnapshot(nextSnapshot)
      } catch (error) {
        if (!isMountedRef.current) {
          return
        }

        setError(`Failed to load debug information: ${String(error)}`)
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false)
        }
      }
    }

    void loadDebugInfo()
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const snapshotPageProps = { snapshot, error, isLoading }

  return (
    <SidebarNavigation
      title="DeckyZone"
      showTitle
      pages={[
        {
          title: 'Overview',
          content: <OverviewPage {...snapshotPageProps} />,
          route: DECKYZONE_OVERVIEW_ROUTE,
        },
        {
          title: 'Input',
          content: <InputPage {...snapshotPageProps} />,
          route: DECKYZONE_INPUT_ROUTE,
        },
        {
          title: 'Display',
          content: <DisplayPage {...snapshotPageProps} />,
          route: DECKYZONE_DISPLAY_ROUTE,
        },
        {
          title: 'Support Report',
          content: <SupportReportPage />,
          route: DECKYZONE_SUPPORT_REPORT_ROUTE,
        },
      ]}
    />
  )
}

export default DebugInfoPage
