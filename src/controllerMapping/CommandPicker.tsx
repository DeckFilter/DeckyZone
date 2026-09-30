import { Focusable, GamepadButton, type GamepadEvent, NavEntryPositionPreferences as FocusPreference, Tabs } from '@decky/ui'
import { type CSSProperties, type ReactNode, type Ref, useRef, useState } from 'react'
import {
  gamepadCommands, mouseCommands,
  sourceLabel, type MappingCommand, type MappingSource,
} from './commands'
import { ABXYButton, Carat, DirectionalButton, GenericGamepad, MappingFocusable, MappingFocusGroup, WholeMouseImage, type NavHandle } from './nativeUi'
import { MappingGlyph, sourceGlyph, StickClickGlyph } from './MappingGlyph'
import { KeyboardLayout, NumpadLayout } from './KeyboardLayout'

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
  secondaryLabel?: ReactNode
  icon?: ReactNode
  className?: string
  style?: CSSProperties
  labelStyle?: CSSProperties
  noFocusRing?: boolean
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
        noFocusRing: true,
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

  const commandKey = ({ command, children, secondaryLabel, icon, className = '', style, labelStyle, navRef, onGamepadDirection, noFocusRing = false }: CommandKeyProps) => (
    <MappingFocusable
      key={command.id}
      className={`dz-mapping-command ${className} ${selected?.id === command.id ? css.SelectedBinding ?? '' : ''}`}
      style={style}
      navRef={navRef}
      onGamepadDirection={onGamepadDirection}
      data-command={command.id}
      aria-label={command.label}
      aria-pressed={selected?.id === command.id}
      aria-disabled={busy}
      preferredFocus={selected?.id === command.id}
      onActivate={() => { void select(command) }}
      focusable={!busy}
      onOKActionDescription="Select"
      noFocusRing={noFocusRing}
    >
      {icon}
      {secondaryLabel != null && <div className={css.KeyboardKeyLabel}>{secondaryLabel}</div>}
      <div className={css.KeyboardKeyLabel} style={labelStyle}>{children ?? command.label}</div>
    </MappingFocusable>
  )
  const gamepadKey = (id: string, className: string, children?: ReactNode) => commandKey({
    command: gamepadCommands[id], className, children, noFocusRing: true,
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
  const prompt = (category: 'gamepad' | 'mouse' | 'keyboard') => (
    <div className={css.ChooseBindingLabel}>
      <div className={css.FrontText}>Select a {category} command for</div>
      <div className={css.GroupText}>{source.group === 'Dials' ? (source.id.startsWith('left-') ? 'Left Dial' : 'Right Dial') : source.group} → </div>
      <div className={css.InputGlyph}><MappingGlyph src={sourceGlyph(source)} label={sourceLabel(source)} white={source.group === 'Dials'} size={25} block /></div>
    </div>
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
        {prompt('gamepad')}
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
  const keyboard = <div className={css.KeyboardPageContainer}>{prompt('keyboard')}<KeyboardLayout classes={css} renderKey={commandKey} /></div>
  const numpad = <>{prompt('keyboard')}<NumpadLayout classes={css} renderKey={commandKey} /></>
  const mouseKey = (id: string, label?: string, glyph?: string, className = '') => {
    const command = mouseCommands.find((item) => item.id === `mouse:${id}`)!
    return commandKey({
      command,
      children: label,
      icon: glyph ? <img src={`/steaminputglyphs/${glyph}.svg`} alt="" aria-hidden /> : undefined,
      className: `${css.MouseKey} ${className}`,
    })
  }
  const mouse = (
    <>
      {prompt('mouse')}
      <Focusable className={css.MousePageContainer} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
        <Focusable className={css.GamepadKeyColumn} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
          {mouseKey('left', 'Left Mouse Click', 'shared_mouse_l_click', css.LeftMouseClickGap)}
          {mouseKey('middle', 'Middle Mouse Click', 'shared_mouse_mid_click')}
          {mouseKey('right', 'Right Mouse Click', 'shared_mouse_r_click')}
          {mouseKey('back', 'Mouse 4 Click', 'shared_mouse_4', css.ForwardButtonGap)}
          {mouseKey('forward', 'Mouse 5 Click', 'shared_mouse_5')}
        </Focusable>
        <div className={css.MouseCenterImage} style={{ alignSelf: 'flex-start' }} aria-hidden>
          {WholeMouseImage && <WholeMouseImage />}
        </div>
        <Focusable className={`${css.GamepadKeyColumn} ${css.MouseMovementContainer}`} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
          <Focusable className={css.GamepadKeyColumn} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
            {mouseKey('wheel-up', 'Scroll Wheel Up', 'shared_mouse_scroll_up')}
            {mouseKey('wheel-down', 'Scroll Wheel Down', 'shared_mouse_scroll_down')}
          </Focusable>
        </Focusable>
      </Focusable>
    </>
  )

  return (
    <MappingFocusable
      className={`dz-mapping-picker ${css.ChooseBindingContainer ?? ''}`}
      onCancel={cancel}
      onCancelActionDescription="Back"
      onSecondaryButton={selected && !busy ? () => { void select() } : undefined}
      onSecondaryActionDescription={selected ? 'Clear' : undefined}
      data-mapping-source={source.id}
      aria-busy={busy}
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
        ]}
      />
    </MappingFocusable>
  )
}
