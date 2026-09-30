import {
  ButtonItem,
  DialogBody,
  DialogBodyText,
  DialogButton,
  DialogControlsSection,
  Field,
  Menu,
  MenuItem,
  Navigation,
  NavEntryPositionPreferences as FocusPreference,
  showContextMenu,
  showModal,
  SteamSpinner,
  useParams,
} from '@decky/ui'
import { callable } from '@decky/api'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { FaCog, FaGamepad, FaTrash } from 'react-icons/fa'
import SettingsDialogSubHeader from '../components/SettingsDialogSubHeader'
import GameControllerGeneral from '../components/controller/GameControllerGeneral'
import { awaitGameControllerSaves } from '../components/controller/useGameControllerSettings'
import { controllerMappingRoute, openControllerMapping } from '../routes'
import { showDeckyToast } from '../utils/toasts'
import { useDeckyZoneState } from '../state/DeckyZoneState'
import type { ControllerMappingProfile as MappingProfile, PluginSettings, TrackpadMode } from '../types/plugin'
import CommandPicker from './CommandPicker'
import RemoveGameSettingsModal from './RemoveGameSettingsModal'
import { commandsById, mappingSources, sourceLabel, type MappingCommand, type MappingSource } from './commands'
import { getMappingUi, MappingDropdown, MappingFocusable, MappingGamePage, MappingSidebar, SettingsIcon, sidebarFocus } from './nativeUi'
import { dialGlyph, MappingGlyph, sourceGlyph, trackpadGlyph } from './MappingGlyph'
import { mappingStyles } from './styles'
import homeGlyph from '../glyphs/source/assets/zotac/zone/home.svg'

type TrackpadSide = 'left' | 'right'
type DialMode = 'volume' | 'brightness' | 'custom'
type HomeAction = MappingProfile['buttons']['home']
type MappingState = { appId: string; enabled: boolean; profile: MappingProfile; settings?: PluginSettings }
type MappingPageProps = { appId: string; sourceId?: string }
const getMapping = callable<[string], MappingState>('get_controller_mapping')
const setMapping = callable<[string, MappingProfile | null, boolean], MappingState>('set_controller_mapping')
const removeGameSettings = callable<[string], PluginSettings>('remove_game_settings')
let lastEditedGameId: string | undefined

function getGameName(appId: string) {
  const appStore = (
    globalThis as unknown as { appStore?: { GetAppOverviewByAppID: (id: number) => { display_name?: string } | undefined } }
  ).appStore
  return appStore?.GetAppOverviewByAppID(Number(appId))?.display_name ?? `Game ${appId}`
}

export default function ControllerMappingPage(props: MappingPageProps) {
  const gameName = getGameName(props.appId)
  const title = props.appId === '0' ? 'Controller Settings (Custom)' : `${gameName} Controller Settings (Custom)`
  return (
    <MappingGamePage title={title}>
      <ControllerMappingContent {...props} />
    </MappingGamePage>
  )
}

function ControllerMappingContent({ appId, sourceId }: MappingPageProps) {
  const [state, setState] = useState<MappingState | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [generalBusy, setGeneralBusy] = useState(false)
  const inFlight = useRef(false)
  const mounted = useRef(true)
  const { store, bootstrap } = useDeckyZoneState()
  const { section: activeSection } = useParams<{ section?: string }>()
  const [ui] = useState(getMappingUi)
  const lastSource = useRef<string | undefined>(undefined)
  const source = mappingSources.find((item) => item.id === sourceId)
  const baseRoute = controllerMappingRoute(appId)
  const settings = bootstrap.state === 'ready' ? bootstrap.snapshot.settings : undefined
  const gameSettings = settings?.perGameSettings[appId]
  const mappingRevision = JSON.stringify([
    gameSettings?.controllerMapping,
    gameSettings?.enabled,
    gameSettings?.trackpadMode,
    settings?.homeButtonEnabled,
    settings?.trackpadMode,
  ])
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])
  useEffect(() => {
    if (appId !== '0' && activeSection === 'buttons') {
      Navigation.Navigate(`${baseRoute}/general`)
    }
  }, [appId, activeSection, baseRoute])
  useEffect(() => {
    if (inFlight.current) return
    let current = true
    setError('')
    void getMapping(appId).then(
      (value) => {
        if (current && !inFlight.current) setState(value)
      },
      () => {
        if (current) setError('Could not load controller settings.')
      },
    )
    return () => {
      current = false
    }
  }, [appId, mappingRevision])
  const save = async (profile: MappingProfile) => {
    if (inFlight.current || generalBusy || !state) throw new Error('A controller setting is still saving.')
    const previous = state
    inFlight.current = true
    setSaving(true)
    setState({ ...state, profile, enabled: true })
    try {
      const next = await setMapping(appId, profile, true)
      if (mounted.current) setState(next)
      if (next.settings) store.updateSettings(next.settings)
    } catch (error) {
      if (mounted.current) setState(previous)
      showDeckyToast({ title: 'Controller mappings', body: String(error), severity: 'error' })
      throw error
    } finally {
      inFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }
  const setBinding = async (id: string, command?: MappingCommand, restoreDefault = false) => {
    if (!state) return
    const bindings = { ...state.profile.bindings, [id]: command?.id ?? null }
    if (restoreDefault) delete bindings[id]
    await save({ ...state.profile, bindings })
  }
  if (!state) return <DialogBody>{error ? <DialogBodyText>{error}</DialogBodyText> : <SteamSpinner />}</DialogBody>
  const { bindings, behaviors, dials, buttons } = state.profile
  const savedGames = bootstrap.state === 'ready'
    ? Object.entries(bootstrap.snapshot.settings.perGameSettings)
      .filter(([id]) => Number.isSafeInteger(Number(id)) && Number(id) > 0)
      .map(([id]) => ({ appId: id, name: getGameName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }))
    : []
  const disabled = saving || generalBusy
  const removeGameProfile = async (gameId: string) => {
    if (inFlight.current || generalBusy) throw new Error('A controller setting is still saving.')
    const current = store.getSnapshot().bootstrap
    if (current.state !== 'ready') throw new Error('Controller settings are not ready. Try again.')
    const game = current.snapshot.settings.perGameSettings[gameId]
    if (!game) return
    inFlight.current = true
    setSaving(true)
    try {
      await awaitGameControllerSaves(gameId)
      const next = await removeGameSettings(gameId)
      const index = savedGames.findIndex((item) => item.appId === gameId)
      lastEditedGameId = savedGames[index + 1]?.appId ?? savedGames[index - 1]?.appId
      store.updateSettings(next)
    } finally {
      inFlight.current = false
      if (mounted.current) setSaving(false)
    }
  }
  const openBinding = (item: MappingSource) => {
    lastSource.current = item.id
    const section = item.group === 'Dials' ? 'dials' : 'trackpads'
    Navigation.Navigate(`${baseRoute}/${section}/${item.id}`)
  }
  const options = (item: MappingSource, target: EventTarget | null) =>
    showContextMenu(
      <Menu label={sourceLabel(item)}>
        <MenuItem onSelected={() => openBinding(item)}>Change command</MenuItem>
        <MenuItem disabled={disabled} onSelected={() => void setBinding(item.id).catch(() => {})}>
          Clear command
        </MenuItem>
        <MenuItem
          disabled={disabled || !(item.id in bindings)}
          onSelected={() => void setBinding(item.id, undefined, true).catch(() => {})}
        >
          Restore default
        </MenuItem>
      </Menu>,
      target ?? undefined,
    )
  const bindingRow = (item: MappingSource) => (
    <Field
      key={item.id}
      label={<MappingGlyph src={sourceGlyph(item)} label={sourceLabel(item)} className={ui.glyphClass} white={item.group === 'Dials'} />}
      childrenContainerWidth="fixed"
      inlineWrap="keep-inline"
      preferredFocus={item.id === lastSource.current}
    >
      <MappingFocusable
        className={ui.bindingClasses.BindingButtons}
        flow-children="row"
        navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}
      >
        <DialogButton
          className={ui.bindingClasses.BindingButton}
          disabled={disabled}
          data-mapping-row={item.id}
          preferredFocus={item.id === lastSource.current}
          onOKActionDescription="Select"
          onClick={() => openBinding(item)}
        >
          {commandsById.get(bindings[item.id] ?? '')?.label ?? (bindings[item.id] === null ? 'None' : 'Add command')}
        </DialogButton>
        <DialogButton
          className={ui.bindingClasses.BindingOptionsButton}
          disabled={disabled}
          data-mapping-options={item.id}
          aria-label={`${sourceLabel(item)} settings`}
          onOKActionDescription="Settings"
          onClick={(event) => options(item, event.currentTarget)}
        >
          {SettingsIcon ? <SettingsIcon /> : <FaCog />}
        </DialogButton>
      </MappingFocusable>
    </Field>
  )
  const section = (title: string, children: ReactNode) => {
    const Section = ui.Section
    return Section ? (
      <Section key={title} label={title}>
        {children}
      </Section>
    ) : (
      <DialogControlsSection key={title}>
        <SettingsDialogSubHeader>{title}</SettingsDialogSubHeader>
        {children}
      </DialogControlsSection>
    )
  }
  const dialSection = (side: TrackpadSide) =>
    section(
      side === 'left' ? 'Left Dial' : 'Right Dial',
      <>
        <Field label="Behavior" childrenContainerWidth="fixed" inlineWrap="keep-inline">
          <div data-mapping-dial-behavior={side}>
            <MappingDropdown
              controlled
              disabled={disabled}
              menuLabel={`${side === 'left' ? 'Left' : 'Right'} Dial Behavior`}
              rgOptions={[
                { data: 'volume', label: side === 'left' ? 'Volume (Default)' : 'Volume' },
                { data: 'brightness', label: side === 'right' ? 'Brightness (Default)' : 'Brightness' },
                { data: 'custom', label: 'Custom' },
              ]}
              selectedOption={dials[side]}
              onChange={({ data }: { data: DialMode }) => {
                void save({ ...state.profile, dials: { ...dials, [side]: data } }).catch(() => {})
              }}
            />
          </div>
        </Field>
        {dials[side] === 'custom' && mappingSources.filter((item) => item.id.startsWith(`${side}-dial-`)).map(bindingRow)}
      </>,
    )
  const trackpadSection = (side: TrackpadSide) => {
    const title = side === 'left' ? 'Left Trackpad' : 'Right Trackpad'
    const behaviorOptions: { data: TrackpadMode; label: string }[] = [
      { data: 'disabled', label: 'None' },
      { data: 'default', label: side === 'left' ? 'Scroll Wheel (Default)' : 'As Mouse (Default)' },
      { data: 'directional_buttons', label: 'Button Pad' },
    ]
    return section(
      title,
      <>
        <Field label="Behavior" childrenContainerWidth="fixed" inlineWrap="keep-inline">
          <div data-mapping-behavior={side}>
            <MappingDropdown
              controlled
              disabled={disabled}
              menuLabel={`${title} Behavior`}
              rgOptions={behaviorOptions}
              selectedOption={behaviors[side]}
              onChange={({ data }: { data: TrackpadMode }) => {
                void save({ ...state.profile, behaviors: { ...behaviors, [side]: data } }).catch(() => {})
              }}
            />
          </div>
        </Field>
        {behaviors[side] === 'directional_buttons' && mappingSources.filter((item) => item.group === title).map(bindingRow)}
      </>,
    )
  }
  if (!source) {
    return (
      <div data-deckyzone-mapping={appId} style={{ height: '100%', width: '100%' }}>
        <MappingSidebar
          showTitle={false}
          disableRouteReporting
          eInitialFocus={lastSource.current || (appId === '0' && activeSection === 'games' && lastEditedGameId)
            ? sidebarFocus?.k_EPagedSettingsInitialFocus_PageContent : undefined}
          pages={[
            {
              title: 'General',
              icon: SettingsIcon ? <SettingsIcon /> : <FaCog />,
              route: `${baseRoute}/general`,
              content: (
                <DialogBody>
                  {settings ? (
                    <GameControllerGeneral
                      appId={appId}
                      gameName={appId === '0' ? undefined : getGameName(appId)}
                      settings={settings}
                      onSettingsChange={(update) => store.updateSettings(update)}
                      disabled={saving}
                      onBusyChange={setGeneralBusy}
                    />
                  ) : bootstrap.state === 'error' ? (
                    <DialogBodyText>{bootstrap.message}</DialogBodyText>
                  ) : <SteamSpinner />}
                </DialogBody>
              ),
            },
            {
              title: 'Dials',
              icon: <MappingGlyph src={dialGlyph} label="Dials" className={ui.glyphClass} white />,
              route: `${baseRoute}/dials`,
              content: (
                <DialogBody>
                  {dialSection('left')}
                  {dialSection('right')}
                </DialogBody>
              ),
            },
            {
              title: 'Trackpads',
              icon: <MappingGlyph src={trackpadGlyph} label="Trackpads" className={ui.glyphClass} />,
              route: `${baseRoute}/trackpads`,
              content: (
                <DialogBody>
                  {trackpadSection('left')}
                  {trackpadSection('right')}
                </DialogBody>
              ),
            },
            ...(appId === '0' ? [{
              title: 'Buttons',
              icon: <MappingGlyph src={homeGlyph} label="Buttons" className={ui.glyphClass} />,
              route: `${baseRoute}/buttons`,
              content: (
                <DialogBody>
                  <Field
                    label={<MappingGlyph src={homeGlyph} label="Home Button" className={ui.glyphClass} />}
                    childrenContainerWidth="fixed"
                    inlineWrap="keep-inline"
                  >
                    <div data-mapping-home-behavior>
                      <MappingDropdown
                        controlled
                        disabled={disabled}
                        menuLabel="Home Button"
                        rgOptions={[
                          { data: 'screenshot', label: 'Screenshot (Default)' },
                          { data: 'steam_home', label: 'Steam Home' },
                        ]}
                        selectedOption={buttons.home}
                        onChange={({ data }: { data: HomeAction }) => {
                          void save({ ...state.profile, buttons: { ...buttons, home: data } }).catch(() => {})
                        }}
                      />
                    </div>
                  </Field>
                </DialogBody>
              ),
            }] : []),
            'spacer',
            'separator',
            {
              title: 'Game settings',
              icon: <FaGamepad />,
              visible: appId === '0',
              route: `${baseRoute}/games`,
              content: (
                <DialogBody>
                  {bootstrap.state === 'loading' ? <SteamSpinner /> : bootstrap.state === 'error' ? (
                    <DialogBodyText>{bootstrap.message}</DialogBodyText>
                  ) : savedGames.length === 0 ? (
                    <MappingFocusable focusable preferredFocus data-game-settings-empty>
                      <DialogBodyText>No game settings yet.</DialogBodyText>
                    </MappingFocusable>
                  ) : savedGames.map((game) => (
                    <Field
                      key={game.appId}
                      label={game.name}
                      childrenContainerWidth="fixed"
                      inlineWrap="keep-inline"
                      preferredFocus={game.appId === lastEditedGameId}
                    >
                      <MappingFocusable
                        className={ui.bindingClasses.BindingButtons}
                        flow-children="row"
                        navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}
                      >
                        <DialogButton
                          className={ui.bindingClasses.BindingButton}
                          disabled={disabled}
                          data-mapping-edit-game={game.appId}
                          preferredFocus={game.appId === lastEditedGameId}
                          onClick={() => {
                            lastEditedGameId = game.appId
                            openControllerMapping(game.appId)
                          }}
                        >
                          Edit
                        </DialogButton>
                        <DialogButton
                          className={ui.bindingClasses.BindingOptionsButton}
                          disabled={disabled}
                          data-mapping-remove-game={game.appId}
                          aria-label={`Remove settings for ${game.name}`}
                          onOKActionDescription="Remove"
                          onClick={() => showModal(
                            <RemoveGameSettingsModal
                              title="Remove game settings?"
                              description={`Remove all controller settings for ${game.name}? Custom mappings, rumble overrides and Xbox controller simulation will be removed. The game will use global mappings and rumble settings.`}
                              onRemove={() => removeGameProfile(game.appId)}
                            />,
                          )}
                        >
                          <FaTrash aria-hidden="true" />
                        </DialogButton>
                      </MappingFocusable>
                    </Field>
                  ))}
                </DialogBody>
              ),
            },
            {
              title: 'Global settings',
              icon: SettingsIcon ? <SettingsIcon /> : <FaCog />,
              visible: appId !== '0',
              route: `${baseRoute}/global`,
              content: (
                <DialogBody>
                  <ButtonItem
                    bottomSeparator="none"
                    highlightOnFocus={false}
                    disabled={disabled}
                    data-mapping-open-global
                    onClick={() => openControllerMapping('0')}
                  >
                    Open global settings
                  </ButtonItem>
                </DialogBody>
              ),
            },
          ]}
        />
      </div>
    )
  }
  const body = (
    <div className="dz-mapping" data-deckyzone-mapping={appId}>
      <style>{mappingStyles}</style>
      <CommandPicker
        key={source.id}
        source={source}
        selected={commandsById.get(bindings[source.id] ?? '')}
        busy={saving}
        classes={ui.classes}
        onSelect={async (command) => {
          await setBinding(source.id, command)
          Navigation.NavigateBack()
        }}
        onCancel={() => Navigation.NavigateBack()}
      />
    </div>
  )
  const Page = ui.Page
  return Page ? (
    <Page scrollable={false} dialogContentPadding="none" contentMaxWidth="full-width" headerVisibility="default">
      {body}
    </Page>
  ) : (
    <div className="dz-mapping-fallback">{body}</div>
  )
}
