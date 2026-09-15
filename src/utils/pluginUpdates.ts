import { callable } from '@decky/api'

const getLatestVersionNum = callable<[], string>('get_latest_version_num')
const VERSION_CACHE_KEY = 'DeckyZone.versionCache'

export type VersionCache = {
  installedVersionNum: string
  latestVersionNum: string
  lastCheckTime: number
}

let startupCheck: Promise<VersionCache> | null = null
let startupInstalledVersionNum = ''
let checkIsPending = false

export const readVersionCache = (installedVersionNum: string): VersionCache | null => {
  try {
    const rawCache = localStorage.getItem(VERSION_CACHE_KEY)
    if (!rawCache) {
      return null
    }

    const parsedCache = JSON.parse(rawCache) as Partial<VersionCache>
    if (
      typeof parsedCache.installedVersionNum !== 'string' ||
      typeof parsedCache.latestVersionNum !== 'string' ||
      typeof parsedCache.lastCheckTime !== 'number' ||
      parsedCache.installedVersionNum !== installedVersionNum
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
    try {
      localStorage.removeItem(VERSION_CACHE_KEY)
    } catch {
      // Cache access should not prevent a fresh release check.
    }
    return null
  }
}

export const compareVersions = (left: string, right: string): number => {
  const leftParts = left
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
  const rightParts = right
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0)
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

const fetchLatestVersion = async (installedVersionNum: string): Promise<VersionCache> => {
  const latestVersionNum = await getLatestVersionNum()
  const cache: VersionCache = {
    installedVersionNum,
    latestVersionNum,
    lastCheckTime: Date.now(),
  }

  try {
    localStorage.setItem(VERSION_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // The release check still succeeded even if the UI cache is unavailable.
  }

  return cache
}

const startCheck = (installedVersionNum: string): Promise<VersionCache> => {
  const check = fetchLatestVersion(installedVersionNum)
  startupInstalledVersionNum = installedVersionNum
  startupCheck = check
  checkIsPending = true

  void check.then(
    () => {
      if (startupCheck === check) {
        checkIsPending = false
      }
    },
    () => {
      if (startupCheck === check) {
        startupCheck = null
        checkIsPending = false
      }
    },
  )

  return check
}

// Called on plugin initialization; a previous UI cache never skips this check.
export const checkLatestVersion = (installedVersionNum: string): Promise<VersionCache> => {
  if (startupCheck && startupInstalledVersionNum === installedVersionNum) {
    return startupCheck
  }

  return startCheck(installedVersionNum)
}

// The panel's manual button performs another fresh check after startup.
export const recheckLatestVersion = (installedVersionNum: string): Promise<VersionCache> => {
  if (checkIsPending && startupCheck && startupInstalledVersionNum === installedVersionNum) {
    return startupCheck
  }

  return startCheck(installedVersionNum)
}

export const resetStartupCheck = () => {
  startupCheck = null
  startupInstalledVersionNum = ''
  checkIsPending = false
}
