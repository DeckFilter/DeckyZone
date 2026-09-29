import { Focusable, GamepadButton, type GamepadEvent, NavEntryPositionPreferences as FocusPreference, Tabs } from '@decky/ui'
import { type CSSProperties, type ReactNode, type Ref, useRef, useState } from 'react'
import { FaMouse } from 'react-icons/fa'
import {
  gamepadCommands, keyboardRows, mouseCommands, navigationKeys, numpadRows,
  sourceLabel, type MappingCommand, type MappingSource,
} from './commands'
import { ABXYButton, Carat, DirectionalButton, GenericGamepad, MappingFocusable, MappingFocusGroup, type NavHandle } from './nativeUi'
import { MappingGlyph, sourceGlyph, StickClickGlyph } from './MappingGlyph'

type Props = {
  source: MappingSource
  selected?: MappingCommand
  classes: Record<string, string>
  onSelect: (command?: MappingCommand) => Promise<void>
  busy?: boolean
  onCancel: () => void
}

type CommandKeyProps = {
  command: MappingCommand
  children?: ReactNode
  className?: string
  style?: CSSProperties
  navRef?: Ref<NavHandle | null>
  onGamepadDirection?: (event: GamepadEvent) => void
}

function CardinalGroup({ entries, shape, classes: css, className = '', renderKey }: {
  entries: CommandKeyProps[]
  shape: 'Circle' | 'Diamond'
  classes: Record<string, string>
  className?: string
  renderKey: (props: CommandKeyProps) => ReactNode
}) {
  const top = useRef<NavHandle | null>(null)
  const bottom = useRef<NavHandle | null>(null)
  const left = useRef<NavHandle | null>(null)
  const right = useRef<NavHandle | null>(null)
  const center = useRef<NavHandle | null>(null)
  const refs = [top, bottom, left, right, center]
  const direction = (event: GamepadEvent) => {
    const index = [GamepadButton.DIR_UP, GamepadButton.DIR_DOWN, GamepadButton.DIR_LEFT, GamepadButton.DIR_RIGHT].indexOf(event.detail.button)
    if (index < 0) return
    const target = refs[index].current
    const opposite = refs[[1, 0, 3, 2][index]].current
    if (entries.length === 5 && opposite?.BHasFocus()) center.current?.TakeFocus(event.detail.button)
    else if (target?.BHasFocus()) target.ParentTakeFocus(event.detail.button)
    else target?.TakeFocus(event.detail.button)
    event.stopPropagation()
  }
  const Group = MappingFocusGroup ?? MappingFocusable
  return (
    <Group className={`${css.CardinalButtonGroup} ${css[shape]} ${className}`} data-command-group={entries[0].command.id} navEntryPreferPosition={FocusPreference.PREFERRED_CHILD} noFocusRing>
      {entries.map((entry, index) => renderKey({
        ...entry,
        className: `dz-mapping-cardinal ${css.CardinalButtonGroupButton} ${css[['TopButton', 'BottomButton', 'LeftButton', 'RightButton', 'CenterButton'][index]]}`,
        navRef: refs[index],
        onGamepadDirection: direction,
      }))}
    </Group>
  )
}

export default function CommandPicker({ source, selected, classes: css, onSelect, onCancel, busy = false }: Props) {
  const [tab, setTab] = useState(selected?.category ?? 'gamepad')
  const completed = useRef(false)
  const select = async (command?: MappingCommand) => {
    if (completed.current || busy) return
    completed.current = true
    try { await onSelect(command) } catch { completed.current = false }
  }
  const cancel = () => {
    if (completed.current || busy) return
    completed.current = true
    onCancel()
  }

  const commandKey = ({ command, children, className = '', style, navRef, onGamepadDirection }: CommandKeyProps) => (
    <MappingFocusable
      key={command.id}
      className={`dz-mapping-command ${className} ${selected?.id === command.id ? css.SelectedBinding ?? '' : ''}`}
      style={style}
      navRef={navRef}
      onGamepadDirection={onGamepadDirection}
      data-command={command.id}
      aria-label={command.label}
      aria-pressed={selected?.id === command.id}
      preferredFocus={selected?.id === command.id}
      onActivate={() => { void select(command) }}
      focusable={!busy}
      onOKActionDescription="Select"
      noFocusRing
    >
      <div className={css.KeyboardKeyLabel}>{children ?? command.label}</div>
    </MappingFocusable>
  )
  const gamepadKey = (id: string, className: string, children?: ReactNode) => commandKey({
    command: gamepadCommands[id], className, children,
  })
  const cardinal = (prefix: string, shape: 'Circle' | 'Diamond', labels: ReactNode[], center?: ReactNode, className?: string) => (
    <CardinalGroup
      shape={shape}
      classes={css}
      className={className}
      renderKey={commandKey}
      entries={[
        ...['up', 'down', 'left', 'right'].map((direction, index) => ({ command: gamepadCommands[`${prefix}-${direction}`], children: labels[index] })),
        ...(center ? [{ command: gamepadCommands[`${prefix}-click`], children: center }] : []),
      ]}
    />
  )
  const arrows = ['up', 'down', 'left', 'right'].map((direction, index) => (
    Carat ? <Carat key={direction} direction={direction} /> : ['↑', '↓', '←', '→'][index]
  ))
  const dpad = ['up', 'down', 'left', 'right'].map((direction, index) => (
    DirectionalButton ? <DirectionalButton key={direction} direction={direction} /> : ['↑', '↓', '←', '→'][index]
  ))
  const abxy = (
    <CardinalGroup
      shape="Diamond"
      classes={css}
      renderKey={commandKey}
      entries={['y', 'a', 'x', 'b'].map((id) => ({
        command: gamepadCommands[id],
        children: ABXYButton ? <ABXYButton button={id.toUpperCase()} /> : id.toUpperCase(),
      }))}
    />
  )
  const gamepad = (
    <Focusable className={css.ColumnContainer} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
      <Focusable className={`${css.Column ?? ''} ${css.Left ?? ''}`} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
        <Focusable className={css.BumperTriggerGroup} flow-children="column">
          {gamepadKey('lt', css.TriggerButton ?? 'dz-mapping-key')}
          {gamepadKey('lb', css.BumperButton ?? 'dz-mapping-key')}
        </Focusable>
        {cardinal('left-stick', 'Circle', arrows, <StickClickGlyph side="left" />)}
        {cardinal('dpad', 'Diamond', dpad, undefined, css.InsetLeftGroup)}
      </Focusable>
      <Focusable className={css.Column} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
        <div className={css.ChooseBindingLabel}>
          <div className={css.FrontText}>Select a gamepad command for</div>
          <div className={css.GroupText}>{source.group === 'Dials' ? (source.id.startsWith('left-') ? 'Left Dial' : 'Right Dial') : source.group} → </div>
          <div className={css.InputGlyph}><MappingGlyph src={sourceGlyph(source)} label={sourceLabel(source)} white={source.group === 'Dials'} /></div>
        </div>
        <Focusable className={css.SelectStartGroup} flow-children="row">
          {gamepadKey('select', css.SelectButton ?? 'dz-mapping-key')}
          {gamepadKey('start', css.StartButton ?? 'dz-mapping-key')}
        </Focusable>
        {GenericGamepad && <GenericGamepad className={css.GamepadPreview} aria-hidden />}
      </Focusable>
      <Focusable className={`${css.Column ?? ''} ${css.Right ?? ''}`} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
        <Focusable className={css.BumperTriggerGroup} flow-children="column">
          {gamepadKey('rt', css.TriggerButton ?? 'dz-mapping-key')}
          {gamepadKey('rb', css.BumperButton ?? 'dz-mapping-key')}
        </Focusable>
        {abxy}
        {cardinal('right-stick', 'Circle', arrows, <StickClickGlyph side="right" />, css.InsetRightGroup)}
      </Focusable>
    </Focusable>
  )
  const keyboard = (
    <Focusable className="dz-mapping-keyboard" flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
      {keyboardRows.map((row, index) => (
        <Focusable key={index} className="dz-mapping-key-row" flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
          {row.map((key) => commandKey({ command: key, children: key.text, className: 'dz-mapping-key', style: { flex: `${key.width} 1 0` } }))}
        </Focusable>
      ))}
    </Focusable>
  )
  const numpad = (
    <Focusable className="dz-mapping-numpad" flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
      <Focusable className="dz-mapping-navigation" flow-children="grid" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
        {navigationKeys.map((key) => commandKey({
          command: key,
          children: key.text,
          className: 'dz-mapping-key',
          style: key.id === 'numpad:ArrowUp' ? { gridColumn: 2 } : key.id === 'numpad:ArrowLeft' ? { gridColumn: 1 } : undefined,
        }))}
      </Focusable>
      <Focusable flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
        {numpadRows.map((row, index) => (
          <Focusable key={index} className="dz-mapping-key-row" flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
            {row.map((key) => commandKey({ command: key, children: key.text, className: 'dz-mapping-key' }))}
          </Focusable>
        ))}
      </Focusable>
    </Focusable>
  )
  const mouseColumn = (commands: MappingCommand[]) => (
    <Focusable className="dz-mapping-mouse-column" flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
      {commands.map((command) => commandKey({ command, className: 'dz-mapping-key' }))}
    </Focusable>
  )
  const mouse = (
    <Focusable className="dz-mapping-mouse" flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
      {mouseColumn(mouseCommands.slice(0, 5))}
      <FaMouse className="dz-mapping-mouse-art" aria-hidden />
      {mouseColumn(mouseCommands.slice(5))}
    </Focusable>
  )

  return (
    <MappingFocusable
      className={`dz-mapping-picker ${css.ChooseBindingContainer ?? ''}`}
      onCancel={cancel}
      onCancelActionDescription="Back"
      onSecondaryButton={selected && !busy ? () => { void select() } : undefined}
      onSecondaryActionDescription={selected ? 'Clear' : undefined}
      data-mapping-source={source.id}
    >
      <Tabs
        activeTab={tab}
        onShowTab={setTab}
        autoFocusContents
        cancelSkipTabHeader
        canBeHeaderBackground="always"
        tabs={[
          { id: 'gamepad', title: 'Gamepad', content: gamepad },
          { id: 'mouse', title: 'Mouse', content: mouse },
          { id: 'keyboard', title: 'Keyboard', content: keyboard },
          { id: 'numpad', title: 'Numpad', content: numpad },
        ].map((item) => ({ ...item, content: (
          <>
            {item.id !== 'gamepad' && <div className="dz-mapping-prompt">Choose a command for {sourceLabel(source)}</div>}
            {item.content}
            {selected && (
              <div className="dz-mapping-remove">
                <MappingFocusable className="dz-mapping-key dz-mapping-command" focusable={!busy} onActivate={() => { void select() }} onOKActionDescription="Clear">Clear command</MappingFocusable>
              </div>
            )}
          </>
        ) }))}
      />
    </MappingFocusable>
  )
}
