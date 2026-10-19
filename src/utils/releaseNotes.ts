import { callable } from '@decky/api'

export type PluginRelease = {
  id: number
  version: string
  name: string
  body: string
  publishedAt: string
  url: string
}

const fetchReleaseNotes = callable<[], PluginRelease[]>('get_release_notes')
const CACHE_DURATION_MS = 5 * 60 * 1000

let cachedReleases: PluginRelease[] | null = null
let cacheTime = 0
let pendingRequest: Promise<PluginRelease[]> | null = null

const releaseBody = (release: PluginRelease) => {
  const version = release.version.replace(/^v/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // git-cliff repeats this version/date heading; the viewer already shows the release title.
  const heading = new RegExp(`^\\s*##[ \\t]+(?:\\[v?${version}\\]|v?${version})(?:[ \\t]+-[ \\t]+\\d{4}-\\d{2}-\\d{2})?[ \\t]*(?:\\r?\\n|$)`)
  return release.body.replace(heading, '').trim()
    || 'No release notes were provided for this version.'
}

export const getReleaseNotes = ({ force = false }: { force?: boolean } = {}): Promise<PluginRelease[]> => {
  if (pendingRequest) {
    return pendingRequest
  }

  if (!force && cachedReleases && Date.now() - cacheTime < CACHE_DURATION_MS) {
    return Promise.resolve(cachedReleases)
  }

  pendingRequest = fetchReleaseNotes().then(
    (releases) => {
      cachedReleases = releases.map((release) => ({ ...release, body: releaseBody(release) }))
      cacheTime = Date.now()
      pendingRequest = null
      return cachedReleases
    },
    (error: unknown) => {
      pendingRequest = null
      throw error
    },
  )

  return pendingRequest
}
