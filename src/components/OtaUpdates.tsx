import { callable } from "@decky/api"
import { ButtonItem, Field, PanelSection, PanelSectionRow } from "@decky/ui"
import { useEffect, useState } from "react"

const getLatestVersionNum = callable<[], string>("get_latest_version_num")
const otaUpdate = callable<[], boolean>("ota_update")

type Props = {
  installedVersionNum: string
}

const OtaUpdates = ({ installedVersionNum }: Props) => {
  const [latestVersionNum, setLatestVersionNum] = useState("")
  const [latestVersionError, setLatestVersionError] = useState<string | null>(null)
  const [updateError, setUpdateError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadLatestVersion = async () => {
      setLatestVersionError(null)
      try {
        const fetchedVersionNum = await getLatestVersionNum()
        if (cancelled) {
          return
        }

        setLatestVersionNum(fetchedVersionNum)
      } catch {
        if (cancelled) {
          return
        }

        setLatestVersionNum("")
        setLatestVersionError("Failed to fetch the latest version.")
      }
    }

    void loadLatestVersion()

    return () => {
      cancelled = true
    }
  }, [])

  let buttonText = `Update to ${latestVersionNum}`

  if (installedVersionNum === latestVersionNum && Boolean(latestVersionNum)) {
    buttonText = "Reinstall Plugin"
  }

  const handleUpdate = async () => {
    setIsUpdating(true)
    setUpdateError(null)
    try {
      const success = await otaUpdate()
      if (!success) {
        setUpdateError("Failed to update DeckyZone.")
      }
    } catch {
      setUpdateError("Failed to update DeckyZone.")
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <PanelSection title="Updates">
      <PanelSectionRow>
        <Field label="Installed Version">{installedVersionNum || "Unknown"}</Field>
      </PanelSectionRow>
      {Boolean(latestVersionNum) && (
        <PanelSectionRow>
          <Field label="Latest Version">{latestVersionNum}</Field>
        </PanelSectionRow>
      )}
      {latestVersionError && (
        <PanelSectionRow>
          <div style={{ color: "red" }}>{latestVersionError}</div>
        </PanelSectionRow>
      )}
      {updateError && (
        <PanelSectionRow>
          <div style={{ color: "red" }}>{updateError}</div>
        </PanelSectionRow>
      )}
      {Boolean(latestVersionNum) && (
        <PanelSectionRow>
          <ButtonItem layout="below" onClick={() => void handleUpdate()} disabled={isUpdating}>
            {isUpdating ? "Updating..." : buttonText}
          </ButtonItem>
        </PanelSectionRow>
      )}
    </PanelSection>
  )
}

export default OtaUpdates
