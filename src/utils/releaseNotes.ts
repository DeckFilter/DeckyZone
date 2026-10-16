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

export const getReleaseNotes = ({ force = false }: { force?: boolean } = {}): Promise<PluginRelease[]> => {
  if (pendingRequest) {
    return pendingRequest
  }

  if (!force && cachedReleases && Date.now() - cacheTime < CACHE_DURATION_MS) {
    return Promise.resolve(cachedReleases)
  }

  pendingRequest = fetchReleaseNotes().then(
    (releases) => {
      cachedReleases = releases
      cacheTime = Date.now()
      pendingRequest = null
      return releases
    },
    (error: unknown) => {
      pendingRequest = null
      throw error
    },
  )

  return pendingRequest
}
