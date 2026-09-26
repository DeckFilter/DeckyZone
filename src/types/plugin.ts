export type PluginStatus = {
  state: string
  message: string
}

export type NativePerformanceState = {
  installed: boolean
  enabled: boolean
  active: boolean
  available: boolean
  blockedReason: string | null
  conflictingPlugins?: string[]
}

export type NativePerformanceResult = {
  ok: boolean
  state: NativePerformanceState | null
  error?: string
}

export type ControllerMode = 'gamepad' | 'desktop'
export type TrackpadMode = 'default' | 'disabled' | 'directional_buttons'

export type GyroMountMatrixFixState = {
  visible: boolean
  enabled: boolean
  available: boolean
  builtIn: boolean
  blockedReason: string | null
  systemPath: string
  managedPath: string
  managedOverrideExists: boolean
  managedOverrideOwned: boolean
  managedOverrideHasMatrix: boolean
}

export type CleanupStepResult = {
  name: string
  ok: boolean
  changed: boolean
  message: string
}

export type PerGameRemapTarget =
  | 'none'
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'select'
  | 'start'
  | 'lb'
  | 'rb'
  | 'lt'
  | 'rt'
  | 'ls'
  | 'rs'
  | 'dpad_up'
  | 'dpad_down'
  | 'dpad_left'
  | 'dpad_right'

export type DebugInfoSnapshot = {
  deviceIdentity: {
    vendorName: string | null
    productName: string | null
    boardName: string | null
    boardVendor: string | null
  }
  osContext: {
    prettyName: string | null
    kernelRelease: string | null
  }
  firmware: {
    ecVersion: string | null
    displayVersion: string | null
  }
  memory: {
    systemRamGb: number | null
    activeVramGb: number | null
  }
  inputPlumber: {
    available: boolean
    version: string | null
    profileName: string | null
    profilePath: string | null
    controllerMode: ControllerMode | null
    controllerModeAvailable: boolean
    targetGamepadPresent: boolean
    targetGamepadPath: string | null
    keyboardPresent: boolean
    keyboardPath: string | null
    controllerRuntimeState: string
    gyroMountMatrixFix: GyroMountMatrixFixState
  }
  zotacZoneKernelDrivers: {
    zotacZoneHidLoaded: boolean
  }
  gamescope: {
    version: string | null
    builtInAvailable: boolean
    managedProfileInstalled: boolean
    greenTintFixEnabled: boolean
    verificationState: string
    baseAssetAvailable: boolean
    greenTintAssetAvailable: boolean
  }
  deckyZoneStatus: {
    message: string
  }
}

export type SystemReport = {
  generatedAt: string
  summary: {
    pluginVersion: string
    deckyVersion: string
    os: string
    kernel: string
    vram: string
    battery: string
  }
  text: string
  truncated: boolean
  logIncluded: boolean
}

export type PerGameSettings = {
  enabled: boolean
  buttonPromptFixEnabled: boolean
  trackpadMode: TrackpadMode
  rumbleEnabled: boolean
  rumbleIntensity: number
  m1RemapTarget: PerGameRemapTarget
  m2RemapTarget: PerGameRemapTarget
}

export type ActiveGame = {
  appid: string
  display_name: string
  icon_data?: string
  icon_data_format?: string
  icon_hash?: string
  local_cache_version?: number | string
}

export type VramState = {
  available: boolean
  pendingVramGb: number | null
  activeVramGb: number | null
  rebootRequired: boolean
  minVramGb: number
  maxVramGb: number
}

export type PluginSettings = {
  legacyLayoutEnabled: boolean
  controllerMode: ControllerMode | null
  controllerModeAvailable: boolean
  homeButtonEnabled: boolean
  brightnessDialFixEnabled: boolean
  gyroMountMatrixFix: GyroMountMatrixFixState
  trackpadMode: TrackpadMode
  zotacGlyphsEnabled: boolean
  hideUnsupportedButtonsEnabled: boolean
  remainingBatteryTimeFixEnabled: boolean
  remainingBatteryTimeFixAvailable: boolean
  gamescopeZotacProfileBuiltIn: boolean
  gamescopeZotacProfileInstalled: boolean
  gamescopeGreenTintFixEnabled: boolean
  gamescopeDisplayRestartRequired: boolean
  gamescopeZotacProfileTargetPath: string
  gamescopeZotacProfileVerificationState: string
  inputplumberAvailable: boolean
  pluginVersionNum?: string
  rumbleEnabled: boolean
  rumbleIntensity: number
  rumbleAvailable: boolean
  perGameSettings: Record<string, PerGameSettings>
  vram: VramState
}

export type PluginResetResult = {
  ok: boolean
  settings: PluginSettings
  status: PluginStatus
  steps: CleanupStepResult[]
}
