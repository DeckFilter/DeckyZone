import { Focusable, Navigation } from '@decky/ui'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { releaseNotesClasses } from './releaseNotesStyles'

type Props = {
  children: string
  onDismiss?: () => void
}

const externalUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : ''
  } catch {
    return ''
  }
}

const ReleaseNotesMarkdown = ({ children, onDismiss }: Props) => (
  <div className={`${releaseNotesClasses.body} dz-release-notes-body`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      urlTransform={externalUrl}
      components={{
        // Focusable's native element is a div, so paragraph containers must accept it.
        p: ({ children: content }) => <div className="dz-release-notes-paragraph">{content}</div>,
        a: ({ children: content, href, title }) => {
          const url = externalUrl(href ?? '')
          if (!url) return <span>{content}</span>

          return (
            <Focusable
              role="link"
              tabIndex={0}
              title={title ?? url}
              className="dz-release-notes-link"
              onOKActionDescription="Open Link"
              onActivate={() => {
                onDismiss?.()
                Navigation.NavigateToExternalWeb(url)
                Navigation.CloseSideMenus()
              }}
            >
              {content}
            </Focusable>
          )
        },
        // Release notes never request remote images when the viewer opens.
        img: ({ alt }) => alt ? <span>{alt}</span> : null,
        table: ({ children: content }) => (
          <div className="dz-release-notes-table"><table>{content}</table></div>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  </div>
)

export default ReleaseNotesMarkdown
