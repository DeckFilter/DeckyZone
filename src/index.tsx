import {
  PanelSection,
  PanelSectionRow,
  staticClasses,
  ToggleField,
} from "@decky/ui";
import { callable, definePlugin } from "@decky/api";
import { useEffect, useState } from "react";
import { FaSlidersH } from "react-icons/fa";

type PluginStatus = {
  state: string;
  message: string;
};

type PluginSettings = {
  startupApplyEnabled: boolean;
  inputplumberAvailable: boolean;
};

const getStatus = callable<[], PluginStatus>("get_status");
const getSettings = callable<[], PluginSettings>("get_settings");
const setStartupApplyEnabled = callable<[boolean], PluginSettings>(
  "set_startup_apply_enabled"
);
const DEFAULT_TOGGLE_DESCRIPTION =
  "Reapplies the Zotac controller target after boot.";

function getToggleDescription(status: PluginStatus, settings: PluginSettings) {
  if (!settings.inputplumberAvailable) {
    return "InputPlumber is not available.";
  }

  if (
    status.state === "failed" ||
    status.state === "disabled" ||
    status.state === "unsupported"
  ) {
    return status.message;
  }

  return DEFAULT_TOGGLE_DESCRIPTION;
}

function Content() {
  const [status, setStatus] = useState<PluginStatus>({
    state: "loading",
    message: "Loading DeckyZone status.",
  });
  const [settings, setSettings] = useState<PluginSettings>({
    startupApplyEnabled: true,
    inputplumberAvailable: true,
  });
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      const nextStatus = await getStatus();
      setStatus(nextStatus);
    } catch (error) {
      setStatus({
        state: "failed",
        message: `Failed to load status: ${String(error)}`,
      });
    }
  };

  const loadSettings = async () => {
    try {
      const nextSettings = await getSettings();
      setSettings(nextSettings);
    } catch (error) {
      setStatus({
        state: "failed",
        message: `Failed to load settings: ${String(error)}`,
      });
    }
  };

  const handleToggleChange = async (enabled: boolean) => {
    setSaving(true);
    try {
      const nextSettings = await setStartupApplyEnabled(enabled);
      setSettings(nextSettings);
      await loadStatus();
    } catch (error) {
      setStatus({
        state: "failed",
        message: `Failed to update startup setting: ${String(error)}`,
      });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    void loadStatus();
    void loadSettings();
  }, []);

  return (
    <PanelSection title="Controller Fix">
      <PanelSectionRow>
        <ToggleField
          label="Apply controller fix on startup"
          checked={settings.startupApplyEnabled}
          onChange={(value: boolean) => void handleToggleChange(value)}
          disabled={saving || !settings.inputplumberAvailable}
          description={getToggleDescription(status, settings)}
        />
      </PanelSectionRow>
    </PanelSection>
  );
}

export default definePlugin(() => {
  return {
    name: "DeckyZone",
    titleView: <div className={staticClasses.Title}>DeckyZone</div>,
    content: <Content />,
    icon: <FaSlidersH />,
    onDismount() {
      console.log("DeckyZone unloaded");
    },
  };
});
