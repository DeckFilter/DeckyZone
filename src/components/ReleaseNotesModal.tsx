import {
  Carousel,
  ConfirmModal,
  DialogBodyText,
  Focusable,
  ScrollPanel,
  Spinner,
  findModuleExport,
  findSP,
  getFocusNavController,
  showModal,
  type GamepadEvent,
} from '@decky/ui'
import { useCallback, useEffect, useRef, useState, type ComponentProps, type ComponentType, type HTMLAttributes, type ReactNode, type RefAttributes, type RefObject } from 'react'
import { getReleaseNotes, type PluginRelease } from '../utils/releaseNotes'
import ReleaseNotesMarkdown from './ReleaseNotesMarkdown'
import { releaseNotesClasses, releaseNotesStyles } from './releaseNotesStyles'

type Props = {
  installedVersionNum: string
  closeModal?: () => void
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; releases: PluginRelease[] }

type ScrollProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode
  scrollDirection?: 'y'
}

// Steam's article wrapper only scrolls events from descendants, so reuse its hook directly.
const useNativeScrollDirection = findModuleExport((value) => (
  typeof value === 'function' && value.toString().includes('ScrollOnGamepadDirection top:')
)) as ((
  ref: RefObject<HTMLDivElement | null>,
  behavior?: ScrollBehavior,
  stepPercent?: number,
  shouldHandle?: (event: GamepadEvent) => boolean,
) => (event: GamepadEvent) => boolean) | undefined

const nativeArticleScrollType = findModuleExport((value) => (
  typeof value?.NoTransformSparseContent === 'number'
))?.NoTransformSparseContent as number | undefined

const articleScrollEvent = (event: GamepadEvent) => {
  if (event.currentTarget === event.target
    || (event.target as HTMLElement).classList.contains('dz-release-notes-article-focus')) {
    return true
  }
  // Move between native link targets first; scroll the remaining text at their boundaries.
  const tree = getFocusNavController()?.GetActiveNavTree?.()
  for (let node = tree?.GetLastFocusedNode?.()?.Parent;
    node && node.Element !== event.currentTarget; node = node.Parent) {
    if (node.BHasNavTargetInDirection?.(event.detail.button)) return false
  }
  return true
}

// The native component forwards these DOM/focus props; @decky/ui only declares children.
const NativeScrollPanel = ScrollPanel as ComponentType<ScrollProps & RefAttributes<HTMLDivElement> & {
  focusableIfEmpty?: boolean
  onGamepadDirection?: (event: GamepadEvent) => boolean
  scrollIntoViewType?: number
}>

// Steam's changelog uses this group: A enters its children, B returns to the card.
const ArticleFocusable = findModuleExport((value) => {
  const source = value?.render?.toString()
  return source?.includes('onExplicitFocusLevelChanged') && source.includes('navRefPanel')
}) as ComponentType<ComponentProps<typeof Focusable> & {
  focusable?: boolean
  fnScrollIntoViewHandler?: () => boolean
}>

// The carousel owns horizontal placement; article focus must not scroll its ancestors.
const keepArticleInPlace = () => true

const ReleaseNotesScrollPanel = (props: ScrollProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const onGamepadDirection = useNativeScrollDirection?.(ref, 'smooth', undefined, articleScrollEvent)
  return (
    <NativeScrollPanel {...props} ref={ref} focusableIfEmpty
      onGamepadDirection={onGamepadDirection} scrollIntoViewType={nativeArticleScrollType} />
  )
}

// Steam otherwise closes GenericDialog after onOK resolves, including a Retry action.
const ReleaseNotesConfirmModal = ConfirmModal as ComponentType<ComponentProps<typeof ConfirmModal> & {
  bCloseAfterOK?: boolean
}>

const getViewport = () => {
  const steamWindow = findSP()
  return { width: steamWindow.innerWidth, height: steamWindow.innerHeight }
}

const formatDate = (date: string) => {
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })
}

const releaseBody = (release: PluginRelease) => {
  const version = release.version.replace(/^v/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // git-cliff repeats this version/date heading; the article header already shows it.
  const heading = new RegExp(`^\\s*##[ \\t]+(?:\\[v?${version}\\]|v?${version})(?:[ \\t]+-[ \\t]+\\d{4}-\\d{2}-\\d{2})?[ \\t]*(?:\\r?\\n|$)`)
  return release.body.replace(heading, '').trim()
    || 'No release notes were provided for this version.'
}

const ReleaseNotesModal = ({ installedVersionNum, closeModal }: Props) => {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [viewport, setViewport] = useState(getViewport)
  const releaseCount = load.status === 'ready' ? load.releases.length : 0
  const columnWidth = viewport.width * .8
  const edgePadding = (viewport.width - columnWidth) / 2
  // A leading virtual column and trailing cell space let Steam center both boundary cards.
  const getColumnWidth = useCallback((index: number) => (
    columnWidth + (index === releaseCount ? edgePadding : 0)
  ), [columnWidth, edgePadding, releaseCount])

  useEffect(() => {
    let active = true
    setLoad({ status: 'loading' })
    void getReleaseNotes({ force: attempt > 0 })
      .then((releases) => {
        if (active) setLoad({ status: 'ready', releases })
      })
      .catch(() => {
        if (active) setLoad({ status: 'error' })
      })
    return () => { active = false }
  }, [attempt])

  useEffect(() => {
    const steamWindow = findSP()
    const resize = () => setViewport(getViewport())
    steamWindow.addEventListener('resize', resize)
    return () => steamWindow.removeEventListener('resize', resize)
  }, [])

  if (load.status !== 'ready' || !load.releases.length) {
    const loading = load.status === 'loading'
    return (
      <ReleaseNotesConfirmModal
        strTitle={
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            Changelog
            {loading && <Spinner width="24px" height="24px" style={{ marginLeft: 'auto' }} />}
          </div>
        }
        strOKButtonText={loading ? 'Close' : 'Retry'}
        strCancelButtonText="Close"
        bAlertDialog={loading}
        bCloseAfterOK={false}
        onOK={loading ? closeModal : () => setAttempt((value) => value + 1)}
        closeModal={closeModal}
        onCancel={closeModal}
        onEscKeypress={closeModal}
      >
        {loading ? (
          <DialogBodyText>Loading release notes…</DialogBodyText>
        ) : (
          <DialogBodyText>
            {load.status === 'error'
              ? 'Couldn’t load release notes. Check your internet connection and try again.'
              : 'No release notes are available yet.'}
          </DialogBodyText>
        )}
      </ReleaseNotesConfirmModal>
    )
  }

  const carouselHeight = Math.max(160, viewport.height - 40)
  return (
    <Focusable
      className="dz-release-notes-viewer"
      onCancelButton={closeModal}
      onCancel={closeModal}
      onCancelActionDescription="Back"
      aria-label="DeckyZone changelog"
    >
      <style>{releaseNotesStyles}</style>
      <Carousel
        name="DeckyZone release history"
        nNumItems={load.releases.length + 1}
        initialColumn={1}
        nIndexLeftmost={1}
        autoFocus
        enableBumperPaging
        scrollToAlignment="center"
        nHeight={carouselHeight}
        nItemHeight={carouselHeight}
        nItemMarginX={0}
        fnGetColumnWidth={getColumnWidth}
        fnGetId={(index) => index}
        fnDoesItemTakeFocus={(index) => index > 0}
        fnItemRenderer={(index) => {
          const release = load.releases[index - 1]
          if (!release) return null
          const installed = release.version.replace(/^v/, '') === installedVersionNum.replace(/^v/, '')
          const date = formatDate(release.publishedAt)
          return (
            <ReleaseNotesScrollPanel
              className="dz-release-notes-scroll"
              style={{ width: columnWidth }}
              scrollDirection="y"
              aria-label={`${release.version} release notes`}
            >
              <ArticleFocusable className="dz-release-notes-article-focus" focusable noFocusRing
                onOKActionDescription="Select" fnScrollIntoViewHandler={keepArticleInPlace}>
                <article className="dz-release-notes-card">
                  <header className={`${releaseNotesClasses.header} dz-release-notes-header`}>
                    <div className="dz-release-notes-meta">
                      <span className="dz-release-notes-category">Patch notes</span>
                      {date && (
                        <span className="dz-release-notes-date">
                          <span className="dz-release-notes-posted">Posted</span>
                          <time dateTime={release.publishedAt}>{date}</time>
                        </span>
                      )}
                      {installed && <span className="dz-release-notes-installed">Installed</span>}
                    </div>
                    <h1 className={`${releaseNotesClasses.title} dz-release-notes-title`}>
                      {`DeckyZone v${release.version.replace(/^v/, '')}`}
                    </h1>
                  </header>
                  <ReleaseNotesMarkdown onDismiss={closeModal}>
                    {releaseBody(release)}
                  </ReleaseNotesMarkdown>
                </article>
              </ArticleFocusable>
            </ReleaseNotesScrollPanel>
          )
        }}
      />
    </Focusable>
  )
}

export const showReleaseNotesModal = (installedVersionNum: string) => (
  showModal(<ReleaseNotesModal installedVersionNum={installedVersionNum} />)
)

export default ReleaseNotesModal
