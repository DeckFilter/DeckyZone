export type CommandCategory = 'gamepad' | 'mouse' | 'keyboard' | 'numpad'
export type MappingCommand = { id: string; label: string; category: CommandCategory }
export type MappingSource = { id: string; label: string; group: 'Dials' | 'Left Trackpad' | 'Right Trackpad' }

export const mappingSources: MappingSource[] = [
  { id: 'left-dial-counterclockwise', label: 'Left Dial — Counterclockwise', group: 'Dials' },
  { id: 'left-dial-clockwise', label: 'Left Dial — Clockwise', group: 'Dials' },
  { id: 'right-dial-counterclockwise', label: 'Right Dial — Counterclockwise', group: 'Dials' },
  { id: 'right-dial-clockwise', label: 'Right Dial — Clockwise', group: 'Dials' },
  ...(['left', 'right'] as const).flatMap((side) => (
    ['Up', 'Down', 'Left', 'Right'].map((direction): MappingSource => ({
      id: `${side}-trackpad-${direction.toLowerCase()}`,
      label: direction,
      group: side === 'left' ? 'Left Trackpad' : 'Right Trackpad',
    }))
  )),
]

export const sourceLabel = (source: MappingSource) => source.group === 'Dials'
  ? source.label
  : `${source.group} — ${source.label}`

const command = (category: CommandCategory, id: string, label: string): MappingCommand => ({
  id: `${category}:${id}`, label, category,
})

export const gamepadCommands = Object.fromEntries([
  ['a', 'A'], ['b', 'B'], ['x', 'X'], ['y', 'Y'],
  ['lb', 'Left Bumper'], ['rb', 'Right Bumper'], ['lt', 'Left Trigger'], ['rt', 'Right Trigger'],
  ['select', 'Select'], ['start', 'Start'],
  ['dpad-up', 'D-pad Up'], ['dpad-down', 'D-pad Down'], ['dpad-left', 'D-pad Left'], ['dpad-right', 'D-pad Right'],
  ...['left', 'right'].flatMap((side) => ['up', 'down', 'left', 'right', 'click'].map((direction) => [
    `${side}-stick-${direction}`,
    `${side === 'left' ? 'Left' : 'Right'} Stick ${direction[0].toUpperCase()}${direction.slice(1)}`,
  ])),
].map(([id, label]) => [id, command('gamepad', id, label)]))

export const mouseCommands = [
  ['left', 'Left Click'], ['right', 'Right Click'], ['middle', 'Middle Click'],
  ['back', 'Back'], ['forward', 'Forward'],
  ['wheel-up', 'Scroll Up'], ['wheel-down', 'Scroll Down'],
  ['wheel-left', 'Scroll Left'], ['wheel-right', 'Scroll Right'],
  ['move-up', 'Move Up'], ['move-down', 'Move Down'], ['move-left', 'Move Left'], ['move-right', 'Move Right'],
].map(([id, label]) => command('mouse', id, label))

export type KeyboardKey = MappingCommand & {
  text: string
  width: number
  secondaryText?: string
  alignment?: 'left' | 'right'
  localized?: boolean
  grow?: boolean
  fontSize?: number
}
type KeyAppearance = Partial<Pick<KeyboardKey, 'text' | 'width' | 'secondaryText' | 'alignment' | 'localized' | 'grow' | 'fontSize'>>
const key = (id: string, label = id, appearance: KeyAppearance = {}, category: CommandCategory = 'keyboard'): KeyboardKey => ({
  ...command(category, id, label), text: label, width: 53, ...appearance,
})

export const keyboardRows: KeyboardKey[][] = [
  [
    key('Escape', 'Esc', { alignment: 'left', localized: true, grow: true }),
    ...Array.from({ length: 12 }, (_, i) => key(`F${i + 1}`, undefined, { width: 54, alignment: 'left' })),
  ],
  [
    key('Backquote', '`', { width: 28, secondaryText: '~' }),
    ...'1234567890'.split('').map((n, index) => key(`Digit${n}`, n, { secondaryText: '!@#$%^&*()'[index] })),
    key('Minus', '-', { secondaryText: '_' }), key('Equal', '=', { secondaryText: '+' }),
    key('Backspace', 'Backspace', { width: 100, alignment: 'right', localized: true }),
  ],
  [
    key('Tab', 'Tab', { width: 60, alignment: 'left', localized: true }),
    ...'QWERTYUIOP'.split('').map((k) => key(`Key${k}`, k)),
    key('BracketLeft', '[', { secondaryText: '{' }), key('BracketRight', ']', { secondaryText: '}' }),
    key('Backslash', '\\', { secondaryText: '|' }),
  ],
  [
    key('CapsLock', 'Caps Lock', { text: 'CapsLock', width: 80, alignment: 'left', localized: true }),
    ...'ASDFGHJKL'.split('').map((k) => key(`Key${k}`, k)),
    key('Semicolon', ';', { secondaryText: ':' }), key('Quote', "'", { secondaryText: '"' }),
    key('Enter', 'Enter', { width: 100, alignment: 'right', localized: true }),
  ],
  [
    key('ShiftLeft', 'Left Shift', { text: 'Shift', width: 120, alignment: 'left', localized: true }),
    ...'ZXCVBNM'.split('').map((k) => key(`Key${k}`, k)),
    key('Comma', ',', { secondaryText: '<' }), key('Period', '.', { secondaryText: '>' }), key('Slash', '/', { secondaryText: '?' }),
    key('ShiftRight', 'Right Shift', { text: 'Shift', width: 120, alignment: 'right', localized: true }),
  ],
  [
    key('ControlLeft', 'Left Ctrl', { text: 'Ctrl', width: 70, alignment: 'left', localized: true }),
    key('MetaLeft', 'Super', { text: 'Win', width: 70, alignment: 'left', localized: true }),
    key('AltLeft', 'Left Alt', { text: 'Alt', width: 70, alignment: 'left', localized: true }),
    key('Space', 'Space', { width: 417, localized: true }),
    key('AltRight', 'Right Alt', { text: 'Alt', width: 70, alignment: 'right', localized: true }),
    key('ControlRight', 'Right Ctrl', { text: 'Ctrl', width: 70, alignment: 'right', localized: true }),
  ],
]

export const navigationKeys = [
  ['Insert', 'Insert'], ['Home', 'Home'], ['PageUp', 'Page Up'], ['Delete', 'Delete'], ['End', 'End'], ['PageDown', 'Page Down'],
  ['ArrowUp', '↑'], ['ArrowLeft', '←'], ['ArrowDown', '↓'], ['ArrowRight', '→'],
].map(([id, text]) => key(id, id.startsWith('Arrow') ? id.replace('Arrow', 'Arrow ') : text, {
  text: id === 'PageUp' ? 'PgUp' : id === 'PageDown' ? 'PgDn' : text,
  localized: !id.startsWith('Arrow'),
  fontSize: id === 'Delete' ? 13 : 14,
}, 'numpad'))

export const numpadRows = [
  [['NumLock', 'Num Lock'], ['NumpadDivide', '/'], ['NumpadMultiply', '*'], ['NumpadSubtract', '-']],
  [['Numpad7', '7'], ['Numpad8', '8'], ['Numpad9', '9'], ['NumpadAdd', '+']],
  [['Numpad4', '4'], ['Numpad5', '5'], ['Numpad6', '6']],
  [['Numpad1', '1'], ['Numpad2', '2'], ['Numpad3', '3'], ['NumpadEnter', 'Enter']],
  [['Numpad0', '0'], ['NumpadDecimal', '.']],
].map((row) => row.map(([id, text]) => ({
  ...key(id, `Numpad ${text}`, { text, width: id === 'Numpad0' ? 112 : 53, localized: id === 'NumLock' || id === 'NumpadEnter' }, 'numpad'),
})))

export const commandsById = new Map([
  ...Object.values(gamepadCommands), ...mouseCommands,
  ...keyboardRows.flat(), ...navigationKeys, ...numpadRows.flat(),
].map((item) => [item.id, item]))
