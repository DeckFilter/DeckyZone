import { callable } from '@decky/api'
import type { UpdateChannel } from '../types/plugin'

export type PluginRelease = {
  id: number
  version: string
  name: string
  body: string
  publishedAt: string
  url: string
}

const fetchReleaseNotes = callable<[UpdateChannel], PluginRelease[]>('get_release_notes')
const CACHE_DURATION_MS = 5 * 60 * 1000

const cachedReleases = new Map<UpdateChannel, { releases: PluginRelease[]; time: number }>()
const pendingRequests = new Map<UpdateChannel, Promise<PluginRelease[]>>()
let cacheGeneration = 0

const releaseBody = (release: PluginRelease) => {
  const version = release.version.replace(/^v/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // git-cliff repeats this version/date heading; the viewer already shows the release title.
  const heading = new RegExp(`^\\s*##[ \\t]+(?:\\[v?${version}\\]|v?${version})(?:[ \\t]+-[ \\t]+\\d{4}-\\d{2}-\\d{2})?[ \\t]*(?:\\r?\\n|$)`)
  return release.body.replace(heading, '').trim()
    || 'No release notes were provided for this version.'
}

export const getReleaseNotes = (channel: UpdateChannel, { force = false }: { force?: boolean } = {}): Promise<PluginRelease[]> => {
  const pending = pendingRequests.get(channel)
  if (pending) return pending
  const cached = cachedReleases.get(channel)
  if (!force && cached && Date.now() - cached.time < CACHE_DURATION_MS) {
    return Promise.resolve(cached.releases)
  }
  const generation = cacheGeneration
  const request = fetchReleaseNotes(channel).then(
    (releases) => {
      const normalized = releases.map((release) => ({ ...release, body: releaseBody(release) }))
      if (generation === cacheGeneration && pendingRequests.get(channel) === request) {
        cachedReleases.set(channel, { releases: normalized, time: Date.now() })
        pendingRequests.delete(channel)
      }
      return normalized
    },
    (error: unknown) => {
      if (pendingRequests.get(channel) === request) pendingRequests.delete(channel)
      throw error
    },
  )
  pendingRequests.set(channel, request)
  return request
}

export const resetReleaseNotesCache = () => {
  cacheGeneration += 1
  cachedReleases.clear()
  pendingRequests.clear()
}
