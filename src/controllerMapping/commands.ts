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

export type KeyboardKey = MappingCommand & { text: string; width?: number }
const key = (id: string, text = id, width = 1, category: CommandCategory = 'keyboard'): KeyboardKey => ({
  ...command(category, id, text), text, width,
})

export const keyboardRows: KeyboardKey[][] = [
  [key('Escape', 'Esc', 1.3), ...Array.from({ length: 12 }, (_, i) => key(`F${i + 1}`))],
  [key('Backquote', '`'), ...'1234567890'.split('').map((n) => key(`Digit${n}`, n)), key('Minus', '-'), key('Equal', '='), key('Backspace', 'Backspace', 2)],
  [key('Tab', 'Tab', 1.5), ...'QWERTYUIOP'.split('').map((k) => key(`Key${k}`, k)), key('BracketLeft', '['), key('BracketRight', ']'), key('Backslash', '\\', 1.5)],
  [key('CapsLock', 'Caps Lock', 1.8), ...'ASDFGHJKL'.split('').map((k) => key(`Key${k}`, k)), key('Semicolon', ';'), key('Quote', "'"), key('Enter', 'Enter', 2.2)],
  [key('ShiftLeft', 'Left Shift', 2.3), ...'ZXCVBNM'.split('').map((k) => key(`Key${k}`, k)), key('Comma', ','), key('Period', '.'), key('Slash', '/'), key('ShiftRight', 'Right Shift', 2.7)],
  [key('ControlLeft', 'Left Ctrl', 1.5), key('MetaLeft', 'Super', 1.5), key('AltLeft', 'Left Alt', 1.5), key('Space', 'Space', 6), key('AltRight', 'Right Alt', 1.5), key('ControlRight', 'Right Ctrl', 1.5)],
]

export const navigationKeys = [
  ['Insert', 'Insert'], ['Home', 'Home'], ['PageUp', 'Page Up'], ['Delete', 'Delete'], ['End', 'End'], ['PageDown', 'Page Down'],
  ['ArrowUp', '↑'], ['ArrowLeft', '←'], ['ArrowDown', '↓'], ['ArrowRight', '→'],
].map(([id, text]) => ({ ...key(id, text, 1, 'numpad'), label: id.startsWith('Arrow') ? id.replace('Arrow', 'Arrow ') : text }))

export const numpadRows = [
  [['NumLock', 'Num Lock'], ['NumpadDivide', '/'], ['NumpadMultiply', '*'], ['NumpadSubtract', '-']],
  [['Numpad7', '7'], ['Numpad8', '8'], ['Numpad9', '9'], ['NumpadAdd', '+']],
  [['Numpad4', '4'], ['Numpad5', '5'], ['Numpad6', '6']],
  [['Numpad1', '1'], ['Numpad2', '2'], ['Numpad3', '3'], ['NumpadEnter', 'Enter']],
  [['Numpad0', '0'], ['NumpadDecimal', '.']],
].map((row) => row.map(([id, text]) => ({
  ...key(id, text, 1, 'numpad'), label: `Numpad ${text}`,
})))

export const commandsById = new Map([
  ...Object.values(gamepadCommands), ...mouseCommands,
  ...keyboardRows.flat(), ...navigationKeys, ...numpadRows.flat(),
].map((item) => [item.id, item]))
