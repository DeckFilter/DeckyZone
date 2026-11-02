import {
  Focusable,
  GamepadButton,
  NavEntryPositionPreferences,
  ScrollPanel,
  Tabs,
  getGamepadNavigationTrees,
  getReactInstance,
  type FocusableProps,
  type GamepadEvent,
} from '@decky/ui'
import {
  Children,
  Fragment,
  createRef,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
  type RefAttributes,
} from 'react'
import { quickAccessTabsStyles } from './quickAccessTabsStyles'

type NavHandle = {
  BFocusWithin: () => boolean
  TakeFocus: () => boolean
}

type NavigationProps = FocusableProps & {
  navRef?: Ref<NavHandle | null>
  focusable?: boolean
  autoFocus?: boolean
  fnScrollIntoViewHandler?: () => null
}

type NativeTabProps = NavigationProps & {
  tab: string
  activeTab: string
  fnSetActiveTab: (id: string) => void
}

type NativeTabType = ComponentType<NativeTabProps>
type BumperDisplayProps = {
  className?: string
  actionButton: string | number
}
type Bumper = {
  Glyph: ComponentType<BumperDisplayProps>
  actionButton: string | number
  className?: string
  glyphClassName?: string
}
type Fiber = {
  type?: { render?: unknown }
  memoizedProps?: { className?: string; children?: ReactNode }
  return?: Fiber
}

type Props = {
  tabs: { id: string; title: ReactNode; content: ReactNode }[]
  activeTab: string
  onShowTab: (id: string) => void
  autoFocusContents?: boolean
}

const QamFocusable = Focusable as ComponentType<NavigationProps>
const QamScrollPanel = ScrollPanel as ComponentType<HTMLAttributes<HTMLDivElement> & {
  scrollDirection: 'y'
} & RefAttributes<HTMLDivElement>>
const FallbackTabs = Tabs as ComponentType<Props>
let nativeTabType: NativeTabType | null = null
let nativeBumpers: Bumper[] = []

function findNativeBumpers(document: Document) {
  const row = document.querySelector('.FriendsListSteamDeckTabs')
  let fiber = row ? getReactInstance(row) as Fiber | undefined : undefined
  for (let depth = 0; fiber && depth < 24; depth++, fiber = fiber.return) {
    if (!fiber.memoizedProps?.className?.includes('FriendsListSteamDeckTabs')) continue
    const bumpers: Bumper[] = []
    for (const element of Children.toArray(fiber.memoizedProps.children)) {
      if (!isValidElement<{ className?: string; focusable?: boolean; children?: ReactNode }>(element)
        || element.props.focusable !== false) continue
      const glyph = element.props.children
      if (!isValidElement<BumperDisplayProps>(glyph)
        || !['string', 'number'].includes(typeof glyph.props.actionButton)
        || !['function', 'object'].includes(typeof glyph.type)) continue
      // Copy display-only fields. In particular, never retain Steam's original
      // bumper onActivate handler, which selects tabs in the Friends store.
      bumpers.push({
        Glyph: glyph.type as ComponentType<BumperDisplayProps>,
        actionButton: glyph.props.actionButton,
        className: element.props.className,
        glyphClassName: glyph.props.className,
      })
    }
    if (bumpers.length === 2) return bumpers
  }
  return []
}

function findNativeTab(document: Document) {
  // Read the naturally mounted Friends tree. Only retain the independent button
  // type; its parent's callbacks and props belong to Steam's actual Friends UI.
  for (const element of document.querySelectorAll('.FriendsListSteamDeckTabs .FriendsListTab')) {
    let fiber = getReactInstance(element) as Fiber | undefined
    for (let depth = 0; fiber && depth < 24; depth++, fiber = fiber.return) {
      const render = fiber.type?.render
      if (typeof render !== 'function') continue
      const source = Function.prototype.toString.call(render)
      if (source.includes('FriendsListTab') && source.includes('fnSetActiveTab')) {
        return fiber.type as NativeTabType
      }
    }
  }
  return null
}

function useNativeTab(root: RefObject) {
  const [component, setComponent] = useState<NativeTabType | null>(() => nativeTabType)

  useEffect(() => {
    if (component) return
    const observers = new Map<Document, MutationObserver>()
    let interval: ReturnType<typeof setInterval> | undefined
    let attempts = 0
    let stopped = false
    const stop = () => {
      stopped = true
      if (interval) clearInterval(interval)
      for (const observer of observers.values()) observer.disconnect()
      observers.clear()
    }
    const discover = () => {
      if (stopped) return
      const documents = new Set<Document>()
      if (root.current) documents.add(root.current.ownerDocument)
      try {
        for (const tree of getGamepadNavigationTrees() ?? []) {
          const document = tree.Root?.Element?.ownerDocument
          if (document) documents.add(document)
        }
      } catch {
        // Steam can recreate its navigation trees while the QAM is opening.
      }
      for (const document of documents) {
        const found = findNativeTab(document)
        if (found) {
          nativeTabType = found
          nativeBumpers = findNativeBumpers(document)
          stop()
          setComponent(() => found)
          return
        }
        if (!observers.has(document) && document.documentElement) {
          const observer = new MutationObserver((records) => {
            if (records.some((record) => Array.from(record.addedNodes).some((node) => (
              node.nodeType === 1 && (
                (node as Element).matches('.FriendsListTab, .FriendsListSteamDeckTabs')
                || (node as Element).querySelector('.FriendsListSteamDeckTabs')
              )
            )))) discover()
          })
          observer.observe(document.documentElement, { childList: true, subtree: true })
          observers.set(document, observer)
        }
      }
    }
    discover()
    if (!stopped) {
      // Bound navigation-tree discovery; existing documents remain watched for
      // Friends mounting later, and every observer is removed on unmount.
      interval = setInterval(() => {
        discover()
        if (++attempts >= 30 && interval) clearInterval(interval)
      }, 1000)
    }
    return stop
  }, [component, root])

  return component
}

type RefObject = { current: HTMLDivElement | null }

export default function QuickAccessTabs({ tabs, activeTab, onShowTab, autoFocusContents }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const NativeTab = useNativeTab(root)
  const contentRef = useRef<NavHandle | null>(null)
  const rowRef = useRef<NavHandle | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPositions = useRef(new Map<string, number>())
  const tabRefs = useRef(new Map<string, ReturnType<typeof createRef<NavHandle | null>>>())
  const pendingFocus = useRef<'contents' | 'tab' | null>(null)
  const previousTab = useRef(activeTab)
  const id = useId()
  const selected = tabs.find((tab) => tab.id === activeTab) ?? tabs[0]

  for (const tab of tabs) {
    if (!tabRefs.current.has(tab.id)) tabRefs.current.set(tab.id, createRef<NavHandle | null>())
  }

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollPositions.current.get(activeTab) ?? 0
    if (previousTab.current === activeTab) return
    previousTab.current = activeTab
    if (pendingFocus.current === 'contents') contentRef.current?.TakeFocus()
    else if (pendingFocus.current === 'tab') tabRefs.current.get(activeTab)?.current?.TakeFocus()
    pendingFocus.current = null
  }, [activeTab, NativeTab])

  const selectTab = (tab: string) => {
    if (tab === activeTab) return
    if (scrollRef.current) scrollPositions.current.set(activeTab, scrollRef.current.scrollTop)
    pendingFocus.current = contentRef.current?.BFocusWithin()
      ? 'contents'
      : rowRef.current?.BFocusWithin() ? 'tab' : null
    onShowTab(tab)
  }

  const switchSibling = (direction: number) => {
    const next = tabs[tabs.findIndex((tab) => tab.id === selected?.id) + direction]
    if (next) selectTab(next.id)
  }

  const onButtonDown = (event: GamepadEvent) => {
    const direction = event.detail.button === GamepadButton.BUMPER_LEFT ? -1
      : event.detail.button === GamepadButton.BUMPER_RIGHT ? 1 : 0
    if (!direction) return
    switchSibling(direction)
    event.stopPropagation()
  }

  const focusHeader = (event: GamepadEvent) => {
    if (selected && tabRefs.current.get(selected.id)?.current?.TakeFocus()) event.stopPropagation()
  }

  const bumper = (index: number, direction: number) => {
    const display = nativeBumpers[index]
    if (!display) return null
    const { Glyph, actionButton, className, glyphClassName } = display
    return (
      <QamFocusable className={`${className ?? ''} dz-qam-tab-bumper`} focusable={false}
        onActivate={() => switchSibling(direction)} aria-hidden>
        <Glyph actionButton={actionButton} className={glyphClassName} />
      </QamFocusable>
    )
  }

  return (
    <div ref={root} className="dz-qam-tabs" data-native-tabs={Boolean(NativeTab)}>
      <style>{quickAccessTabsStyles}</style>
      {NativeTab && selected ? (
        <QamFocusable className="dz-qam-tabs-layout" flow-children="column" onButtonDown={onButtonDown}
          navEntryPreferPosition={NavEntryPositionPreferences.PREFERRED_CHILD}>
          <QamFocusable className="FriendsListSteamDeckTabs dz-qam-tab-row" role="tablist"
            aria-label="DeckyZone settings" aria-orientation="horizontal" flow-children="row"
            navRef={rowRef} navEntryPreferPosition={NavEntryPositionPreferences.PREFERRED_CHILD}>
            {bumper(0, -1)}
            {tabs.map((tab) => (
              <NativeTab key={tab.id} tab={tab.id} activeTab={selected.id}
                fnSetActiveTab={selectTab} onFocus={() => selectTab(tab.id)}
                preferredFocus={tab.id === selected.id} navRef={tabRefs.current.get(tab.id)}
                id={`${id}-${tab.id}`} role="tab" aria-selected={tab.id === selected.id}
                aria-controls={`${id}-contents`} onOKActionDescription="Select">
                {tab.title}
              </NativeTab>
            ))}
            {bumper(1, 1)}
          </QamFocusable>
          <QamFocusable className="dz-qam-tab-panel" navRef={contentRef}
            preferredFocus={autoFocusContents} autoFocus={autoFocusContents}
            onCancelButton={focusHeader} fnScrollIntoViewHandler={() => null}>
            <QamScrollPanel ref={scrollRef} className="dz-qam-tab-scroll" scrollDirection="y"
              role="tabpanel" id={`${id}-contents`} aria-labelledby={`${id}-${selected.id}`}>
              <Fragment key={selected.id}>{selected.content}</Fragment>
            </QamScrollPanel>
          </QamFocusable>
        </QamFocusable>
      ) : (
        <FallbackTabs tabs={tabs} activeTab={activeTab} onShowTab={onShowTab} autoFocusContents={autoFocusContents} />
      )}
    </div>
  )
}
