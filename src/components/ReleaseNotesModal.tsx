import {
  Carousel,
  ConfirmModal,
  DialogBodyText,
  DialogButton,
  Focusable,
  ScrollPanel,
  Spinner,
  findModuleExport,
  findSP,
  showModal,
  type GamepadEvent,
} from '@decky/ui'
import { useEffect, useRef, useState, type ComponentProps, type ComponentType, type HTMLAttributes, type ReactNode, type RefAttributes, type RefObject } from 'react'
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

const ownScrollEvent = (event: GamepadEvent) => event.currentTarget === event.target

// The native component forwards these DOM/focus props; @decky/ui only declares children.
const NativeScrollPanel = ScrollPanel as ComponentType<ScrollProps & RefAttributes<HTMLDivElement> & {
  focusableIfEmpty?: boolean
  onGamepadDirection?: (event: GamepadEvent) => boolean
}>

const ReleaseNotesScrollPanel = (props: ScrollProps) => {
  const ref = useRef<HTMLDivElement>(null)
  const onGamepadDirection = useNativeScrollDirection?.(ref, 'auto', undefined, ownScrollEvent)
  return <NativeScrollPanel {...props} ref={ref} focusableIfEmpty onGamepadDirection={onGamepadDirection} />
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
    : parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
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
        strTitle="Changelog"
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
          <DialogBodyText><Spinner width="24px" height="24px" /> Loading release notes…</DialogBodyText>
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

  const carouselHeight = Math.max(160, viewport.height - 120)
  // Steam computes bumper page size from visible columns; an adjacent pixel keeps it at one.
  const columnWidth = Math.max(1, viewport.width - 1)
  return (
    <Focusable
      className="dz-release-notes-viewer"
      onCancelButton={closeModal}
      onCancel={closeModal}
      onCancelActionDescription="Close"
      aria-label="DeckyZone changelog"
    >
      <style>{releaseNotesStyles}</style>
      <Carousel
        name="DeckyZone releases"
        nNumItems={load.releases.length}
        initialColumn={0}
        autoFocus
        enableBumperPaging
        scrollToAlignment="center"
        nHeight={carouselHeight}
        nItemHeight={carouselHeight}
        nItemMarginX={0}
        fnGetColumnWidth={() => columnWidth}
        fnGetId={(index) => index}
        fnItemRenderer={(index) => {
          const release = load.releases[index]
          const installed = release.version.replace(/^v/, '') === installedVersionNum.replace(/^v/, '')
          const date = formatDate(release.publishedAt)
          return (
            <div className="dz-release-notes-slide">
              <ReleaseNotesScrollPanel
                className="dz-release-notes-scroll"
                scrollDirection="y"
                aria-label={`${release.version} release notes`}
              >
                <article>
                  <header className={`${releaseNotesClasses.header} dz-release-notes-header`}>
                    <div className="dz-release-notes-meta">
                      {date && <time dateTime={release.publishedAt}>{date}</time>}
                      <span className="dz-release-notes-category">DeckyZone patch notes</span>
                      {installed && <span className="dz-release-notes-installed">Installed</span>}
                    </div>
                    <h1 className={`${releaseNotesClasses.title} dz-release-notes-title`}>
                      {release.name || `DeckyZone ${release.version}`}
                    </h1>
                  </header>
                  <ReleaseNotesMarkdown onDismiss={closeModal}>
                    {releaseBody(release)}
                  </ReleaseNotesMarkdown>
                </article>
              </ReleaseNotesScrollPanel>
            </div>
          )
        }}
      />
      <div className="dz-release-notes-footer">
        <DialogButton onClick={closeModal} style={{ minWidth: '120px', width: 'auto', padding: '6px 24px' }}>
          Close
        </DialogButton>
      </div>
    </Focusable>
  )
}

export const showReleaseNotesModal = (installedVersionNum: string) => (
  showModal(<ReleaseNotesModal installedVersionNum={installedVersionNum} />)
)

export default ReleaseNotesModal
