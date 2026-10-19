import { callable } from '@decky/api'
import type { ReleaseTarget, UpdateChannel } from '../types/plugin'

const getUpdateRelease = callable<[UpdateChannel], ReleaseTarget | null>('get_update_release')
const VERSION_CACHE_KEY = 'DeckyZone.versionCache'
const VERSION_PATTERN = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-pre\.([1-9]\d*))?$/

export type VersionCache = {
  installedVersionNum: string
  channel: UpdateChannel
  release: ReleaseTarget | null
  lastCheckTime: number
}

type Check = { promise: Promise<VersionCache>; pending: boolean }
const checks = new Map<string, Check>()
let cacheGeneration = 0

const parseVersion = (version: string) => {
  const match = VERSION_PATTERN.exec(version)
  return match?.[0] === version ? match : null
}
export const isValidVersion = (version: string): boolean => parseVersion(version) !== null

// Decimal strings preserve ordering even when a version component exceeds JS's safe integer range.
const compareComponent = (left: string, right: string): number => (
  left.length !== right.length ? left.length - right.length : left === right ? 0 : left > right ? 1 : -1
)

export const compareVersions = (left: string, right: string): number => {
  const leftParts = parseVersion(left)
  const rightParts = parseVersion(right)
  if (!leftParts || !rightParts) return 0
  for (let index = 1; index <= 3; index += 1) {
    const difference = compareComponent(leftParts[index], rightParts[index])
    if (difference !== 0) return difference
  }
  if (leftParts[4] === undefined) return rightParts[4] === undefined ? 0 : 1
  if (rightParts[4] === undefined) return -1
  return compareComponent(leftParts[4], rightParts[4])
}

const cacheKey = (installedVersionNum: string, channel: UpdateChannel) => (
  `${VERSION_CACHE_KEY}:${channel}:${installedVersionNum}`
)

const validTarget = (target: unknown, channel: UpdateChannel): target is ReleaseTarget => {
  if (!target || typeof target !== 'object') return false
  const release = target as Partial<ReleaseTarget>
  return Number.isSafeInteger(release.id) && (release.id ?? 0) > 0
    && Number.isSafeInteger(release.assetId) && (release.assetId ?? 0) > 0
    && typeof release.version === 'string' && isValidVersion(release.version)
    && typeof release.tagName === 'string'
    && release.tagName.replace(/^v/, '') === release.version.replace(/^v/, '')
    && typeof release.prerelease === 'boolean'
    && release.prerelease === release.version.includes('-pre.')
    && (channel === 'prerelease' || !release.prerelease)
}

export const readVersionCache = (installedVersionNum: string, channel: UpdateChannel): VersionCache | null => {
  const key = cacheKey(installedVersionNum, channel)
  try {
    const rawCache = localStorage.getItem(key)
    if (!rawCache) return null
    const cached = JSON.parse(rawCache) as Partial<VersionCache>
    if (cached.installedVersionNum !== installedVersionNum || cached.channel !== channel
      || typeof cached.lastCheckTime !== 'number' || !Number.isFinite(cached.lastCheckTime)
      || (cached.release !== null && !validTarget(cached.release, channel))) {
      localStorage.removeItem(key)
      return null
    }
    return cached as VersionCache
  } catch {
    try { localStorage.removeItem(key) } catch { /* A cache failure must not block a release check. */ }
    return null
  }
}

export const getLastCheckText = (lastCheckTime: number): string => {
  const diff = Date.now() - lastCheckTime
  if (diff < 60000) return 'just now'
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  }
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours} hour${hours === 1 ? '' : 's'} ago`
  }
  const days = Math.floor(diff / 86400000)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const startCheck = (installedVersionNum: string, channel: UpdateChannel): Promise<VersionCache> => {
  const key = cacheKey(installedVersionNum, channel)
  const generation = cacheGeneration
  const promise = getUpdateRelease(channel).then((release) => {
    if (release !== null && !validTarget(release, channel)) throw new Error('Invalid update release')
    const cache: VersionCache = { installedVersionNum, channel, release, lastCheckTime: Date.now() }
    if (generation === cacheGeneration && checks.get(key)?.promise === promise) {
      try { localStorage.setItem(key, JSON.stringify(cache)) } catch { /* Cache access is optional. */ }
    }
    return cache
  })
  const check: Check = { promise, pending: true }
  checks.set(key, check)
  void promise.then(
    () => { if (checks.get(key) === check) check.pending = false },
    () => { if (checks.get(key) === check) checks.delete(key) },
  )
  return promise
}

// Initialization always performs a network check, sharing only this plugin session's check.
export const checkLatestVersion = (installedVersionNum: string, channel: UpdateChannel): Promise<VersionCache> => (
  checks.get(cacheKey(installedVersionNum, channel))?.promise ?? startCheck(installedVersionNum, channel)
)

export const recheckLatestVersion = (installedVersionNum: string, channel: UpdateChannel): Promise<VersionCache> => {
  const check = checks.get(cacheKey(installedVersionNum, channel))
  return check?.pending ? check.promise : startCheck(installedVersionNum, channel)
}

export const resetStartupCheck = () => {
  cacheGeneration += 1
  checks.clear()
  try {
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index)
      if (key === VERSION_CACHE_KEY || key?.startsWith(`${VERSION_CACHE_KEY}:`)) localStorage.removeItem(key)
    }
  } catch { /* Invalidating in-memory state is sufficient when storage is unavailable. */ }
}
