import { Focusable, updaterFieldClasses } from '@decky/ui'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { compareVersions } from '../utils/pluginUpdates'
import { getReleaseNotes, type PluginRelease } from '../utils/releaseNotes'
import { showReleaseNotesModal } from './ReleaseNotesModal'
import { releaseNotesHeadings } from './releaseNotesHeadings'

type Props = {
  versionNum: string
  installedVersionNum: string
}

const ReleaseNotesPreview = ({ versionNum, installedVersionNum }: Props) => {
  const [release, setRelease] = useState<PluginRelease | null>(null)

  useEffect(() => {
    let active = true
    setRelease(null)
    void getReleaseNotes()
      .then((releases) => {
        if (active) {
          setRelease(releases.find((entry) => compareVersions(entry.version, versionNum) === 0) ?? null)
        }
      })
      .catch(() => {
        // Release-note failures must not block checking for or installing updates.
      })
    return () => { active = false }
  }, [versionNum])

  if (!release || compareVersions(release.version, versionNum) !== 0) return null

  const publishedAt = new Date(release.publishedAt).getTime()
  const date = Number.isNaN(publishedAt) ? '' : new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
  }).format(Math.ceil((publishedAt - Date.now()) / 86400000), 'day')

  // Port Decky Loader's InlinePatchNotes wrapper and Steam's native preview styling.
  return (
    <Focusable
      className={updaterFieldClasses.PatchNotes}
      onActivate={() => showReleaseNotesModal(installedVersionNum)}
      onOKActionDescription="View Changelog"
    >
      <div className={updaterFieldClasses.PostedTime}>{date}</div>
      <div className={updaterFieldClasses.EventDetailTitle}>{release.name}</div>
      <div className={updaterFieldClasses.EventDetailsBody}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          skipHtml
          components={{
            ...releaseNotesHeadings,
            // The whole preview opens the changelog; links are selectable there.
            a: ({ children }) => <span>{children}</span>,
            img: () => null,
          }}
        >
          {release.body}
        </ReactMarkdown>
      </div>
    </Focusable>
  )
}

export default ReleaseNotesPreview
