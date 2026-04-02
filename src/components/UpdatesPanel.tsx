import { callable } from "@decky/api"
import {
  ButtonItem,
  ConfirmModal,
  Field,
  PanelSection,
  PanelSectionRow,
  showModal,
} from "@decky/ui"
import { useEffect, useMemo, useRef, useState } from "react"

import type { ResetAllSnapshot } from "../types/plugin"

const getLatestVersionNum = callable<[], string>("get_latest_version_num")
const otaUpdate = callable<[], boolean>("ota_update")
const resetAll = callable<[], ResetAllSnapshot>("reset_all")

const VERSION_CACHE_KEY = "DeckyZone.versionCache"

type Props = {
  installedVersionNum: string
  onResetComplete: (snapshot: ResetAllSnapshot) => void
}

type VersionCache = {
  installedVersionNum: string
  latestVersionNum: string
  lastCheckTime: number
}

const readVersionCache = (): VersionCache | null => {
  try {
    const rawCache = localStorage.getItem(VERSION_CACHE_KEY)
    if (!rawCache) {
      return null
    }

    const parsedCache = JSON.parse(rawCache) as Partial<VersionCache>
    if (
      typeof parsedCache.installedVersionNum !== "string"
      || typeof parsedCache.latestVersionNum !== "string"
      || typeof parsedCache.lastCheckTime !== "number"
    ) {
      localStorage.removeItem(VERSION_CACHE_KEY)
      return null
    }

    return {
      installedVersionNum: parsedCache.installedVersionNum,
      latestVersionNum: parsedCache.latestVersionNum,
      lastCheckTime: parsedCache.lastCheckTime,
    }
  } catch {
    localStorage.removeItem(VERSION_CACHE_KEY)
    return null
  }
}

const writeVersionCache = (cache: VersionCache) => {
  localStorage.setItem(VERSION_CACHE_KEY, JSON.stringify(cache))
}

const getLastCheckText = (lastCheckTime: number): string => {
  const diff = Date.now() - lastCheckTime

  if (diff < 60 * 1000) {
    return "just now"
  }

  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`
  }

  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours === 1 ? "" : "s"} ago`
  }

  const days = Math.floor(diff / 86400000)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

const compareVersions = (left: string, right: string): number => {
  const leftParts = left.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0)
  const rightParts = right.replace(/^v/i, "").split(".").map((part) => Number.parseInt(part, 10) || 0)
  const maxLength = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0
    const rightPart = rightParts[index] ?? 0
    if (leftPart !== rightPart) {
      return leftPart - rightPart
    }
  }

  return 0
}

const UpdatesPanel = ({ installedVersionNum, onResetComplete }: Props) => {
  const [latestVersionNum, setLatestVersionNum] = useState("")
  const [lastCheckTime, setLastCheckTime] = useState<number | null>(null)
  const [versionError, setVersionError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [resetError, setResetError] = useState<string | null>(null)
  const [isLoadingLatestVersion, setIsLoadingLatestVersion] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const isMountedRef = useRef(true)

  const loadLatestVersion = async () => {
    setIsLoadingLatestVersion(true)
    setVersionError(null)
    try {
      const fetchedVersionNum = await getLatestVersionNum()
      if (!isMountedRef.current) {
        return
      }

      const nextLastCheckTime = Date.now()
      setLatestVersionNum(fetchedVersionNum)
      setLastCheckTime(nextLastCheckTime)
      writeVersionCache({
        installedVersionNum,
        latestVersionNum: fetchedVersionNum,
        lastCheckTime: nextLastCheckTime,
      })
    } catch {
      if (!isMountedRef.current) {
        return
      }

      setVersionError("Failed to fetch the latest version.")
    } finally {
      if (isMountedRef.current) {
        setIsLoadingLatestVersion(false)
      }
    }
  }

  useEffect(() => {
    const cachedVersionInfo = readVersionCache()
    if (cachedVersionInfo) {
      setLatestVersionNum(cachedVersionInfo.latestVersionNum)
      setLastCheckTime(cachedVersionInfo.lastCheckTime)
    } else {
      void loadLatestVersion()
    }

    return () => {
      isMountedRef.current = false
    }
  }, [])

  const updateButtonText = useMemo(() => {
    if (!latestVersionNum) {
      return "Reinstall Plugin"
    }

    const versionCompare = compareVersions(latestVersionNum, installedVersionNum)
    if (versionCompare > 0) {
      return `Update to ${latestVersionNum}`
    }
    if (versionCompare < 0) {
      return `Rollback to ${latestVersionNum}`
    }
    return "Reinstall Plugin"
  }, [installedVersionNum, latestVersionNum])

  const handleUpdate = async () => {
    setIsUpdating(true)
    setUpdateError(null)
    try {
      const success = await otaUpdate()
      if (!success) {
        setUpdateError("Failed to install the latest DeckyZone release.")
      }
    } catch {
      setUpdateError("Failed to install the latest DeckyZone release.")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    setResetError(null)
    try {
      const snapshot = await resetAll()
      if (!isMountedRef.current) {
        return
      }

      onResetComplete(snapshot)
    } catch {
      if (!isMountedRef.current) {
        return
      }

      setResetError("Failed to reset DeckyZone.")
    } finally {
      if (isMountedRef.current) {
        setIsResetting(false)
      }
    }
  }

  const openResetConfirmation = () => {
    showModal(
      <ConfirmModal
        strTitle="Reset All"
        strDescription="Reset DeckyZone settings and remove DeckyZone-managed display files?"
        strOKButtonText="Reset All"
        strCancelButtonText="Cancel"
        onOK={handleReset}
      />
    )
  }

  return (
    <PanelSection title="Updates">
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => void handleUpdate()}
          disabled={isUpdating || isResetting || !latestVersionNum}
        >
          {isUpdating ? "Installing..." : updateButtonText}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={() => void loadLatestVersion()}
          disabled={isLoadingLatestVersion || isUpdating || isResetting}
          description={lastCheckTime ? `Last check: ${getLastCheckText(lastCheckTime)}` : 'Checks for the latest published version'}
        >
          {isLoadingLatestVersion ? "Checking..." : "Check Version"}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <ButtonItem
          layout="below"
          onClick={openResetConfirmation}
          disabled={isUpdating || isResetting}
          description="Resets DeckyZone settings and removes DeckyZone-managed display files"
        >
          {isResetting ? "Resetting..." : "Reset All"}
        </ButtonItem>
      </PanelSectionRow>
      <PanelSectionRow>
        <Field label="Installed Version">{installedVersionNum || "Unknown"}</Field>
      </PanelSectionRow>
      {Boolean(latestVersionNum) && (
        <PanelSectionRow>
          <Field label="Latest Version">{latestVersionNum}</Field>
        </PanelSectionRow>
      )}
      {versionError && (
        <PanelSectionRow>
          <div style={{ color: "red" }}>{versionError}</div>
        </PanelSectionRow>
      )}
      {updateError && (
        <PanelSectionRow>
          <div style={{ color: "red" }}>{updateError}</div>
        </PanelSectionRow>
      )}
      {resetError && (
        <PanelSectionRow>
          <div style={{ color: "red" }}>{resetError}</div>
        </PanelSectionRow>
      )}
    </PanelSection>
  )
}

export default UpdatesPanel
