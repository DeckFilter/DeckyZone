import {
  Focusable,
  GamepadButton,
  NavEntryPositionPreferences,
  ScrollPanel,
  findModuleExport,
  type FocusableProps,
  type GamepadEvent,
} from '@decky/ui'
import {
  Fragment,
  createRef,
  useId,
  useLayoutEffect,
  useRef,
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

type BumperDisplayProps = {
  className?: string
  actionButton: number
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
const BumperGlyph = findModuleExport(value => {
  if (typeof value !== 'function') return false
  const source = Function.prototype.toString.call(value)
  return source.includes('actionButton')
    && source.includes('NavigationSourceGlyphInfo.GetValue')
    && source.includes('Client controller glyph used outside of client')
}) as ComponentType<BumperDisplayProps> | undefined
const glyphActions = findModuleExport(value => value && typeof value === 'object'
  && ['LeftBumper', 'RightBumper', 'HomeMenu', 'QuickMenu'].every(key => typeof value[key] === 'number')) as {
  LeftBumper: number
  RightBumper: number
} | undefined

export default function QuickAccessTabs({ tabs, activeTab, onShowTab, autoFocusContents }: Props) {
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
  }, [activeTab])

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

  const bumper = (direction: number) => {
    if (!BumperGlyph || !glyphActions) return null
    const actionButton = direction < 0 ? glyphActions.LeftBumper : glyphActions.RightBumper
    return (
      <QamFocusable className="dz-qam-tab-bumper" focusable={false}
        onActivate={() => switchSibling(direction)} aria-hidden>
        <BumperGlyph actionButton={actionButton} />
      </QamFocusable>
    )
  }

  return (
    <div className="dz-qam-tabs">
      <style>{quickAccessTabsStyles}</style>
      {selected && (
        <QamFocusable className="dz-qam-tabs-layout" flow-children="column" onButtonDown={onButtonDown}
          navEntryPreferPosition={NavEntryPositionPreferences.PREFERRED_CHILD}>
          <QamFocusable className="FriendsListSteamDeckTabs dz-qam-tab-row" role="tablist"
            aria-label="DeckyZone settings" aria-orientation="horizontal" flow-children="row"
            navRef={rowRef} navEntryPreferPosition={NavEntryPositionPreferences.PREFERRED_CHILD}>
            {bumper(-1)}
            {tabs.map((tab) => (
              <QamFocusable key={tab.id} focusable
                className={`FriendsListTab${tab.id === selected.id ? ' Active' : ''}`}
                onActivate={() => selectTab(tab.id)} onFocus={() => selectTab(tab.id)}
                preferredFocus={tab.id === selected.id} navRef={tabRefs.current.get(tab.id)}
                id={`${id}-${tab.id}`} role="tab" aria-selected={tab.id === selected.id}
                aria-controls={`${id}-contents`} onOKActionDescription="Select">
                {tab.title}
              </QamFocusable>
            ))}
            {bumper(1)}
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
      )}
    </div>
  )
}
