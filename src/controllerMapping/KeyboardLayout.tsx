import { Focusable, NavEntryPositionPreferences as FocusPreference } from '@decky/ui'
import type { CSSProperties, ReactNode } from 'react'
import { keyboardRows, navigationKeys, numpadRows, type KeyboardKey, type MappingCommand } from './commands'

export type LayoutCommandKeyProps = {
  command: MappingCommand
  children?: ReactNode
  className?: string
  style?: CSSProperties
  labelStyle?: CSSProperties
  secondaryLabel?: ReactNode
  noFocusRing?: boolean
}

type Props = {
  classes: Record<string, string>
  renderKey: (props: LayoutCommandKeyProps) => ReactNode
}

function keyProps(key: KeyboardKey, css: Props['classes']): LayoutCommandKeyProps {
  return {
    command: key,
    children: key.text,
    secondaryLabel: key.secondaryText,
    className: [
      css.KeyboardKey,
      key.alignment === 'left' && css.LeftAlignedLabel,
      key.alignment === 'right' && css.RightAlignedLabel,
      key.localized && css.LocTextKey,
      key.secondaryText && css.HasSecondaryLabel,
    ].filter(Boolean).join(' '),
    style: key.grow ? { flexGrow: 1 } : { width: key.width },
    labelStyle: { fontSize: key.fontSize ?? 14, overflowWrap: 'break-word', wordBreak: 'break-word' },
    noFocusRing: false,
  }
}

export function KeyboardLayout({ classes: css, renderKey }: Props) {
  return (
    <Focusable className={css.KeyboardContainer} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
      {keyboardRows.map((row, index) => (
        <Focusable key={index} className={`${css.KeyboardRow} ${index === 0 ? css.TopRow : ''}`} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
          {row.map((key) => renderKey(keyProps(key, css)))}
        </Focusable>
      ))}
    </Focusable>
  )
}

export function NumpadLayout({ classes: css, renderKey }: Props) {
  const rightColumnIds = new Set(['numpad:NumpadSubtract', 'numpad:NumpadAdd', 'numpad:NumpadEnter'])
  const mainRows = numpadRows.map((row) => row.filter((key) => !rightColumnIds.has(key.id)))
  const rightColumn = numpadRows.flat().filter((key) => rightColumnIds.has(key.id))
  const arrowUp = navigationKeys.find((key) => key.id === 'numpad:ArrowUp')!
  const navigationRows = [navigationKeys.slice(0, 3), navigationKeys.slice(3, 6), [arrowUp], navigationKeys.slice(7)]
  return (
    <Focusable className={css.GamepadGridContainer} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
      <Focusable className={css.NumpadPageContainer} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
        <Focusable flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
          {navigationRows.map((row, index) => (
            <Focusable key={index} className={`${css.NumpadRow} ${index === 0 ? css.TopRow : ''}`} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
              {row.map((key) => {
                const props = keyProps(key, css)
                return renderKey(key.id === arrowUp.id ? {
                  ...props,
                  className: `${props.className} ${css.ThirdRowGap}`,
                  style: { ...props.style, marginTop: 53 },
                } : props)
              })}
            </Focusable>
          ))}
        </Focusable>
        <Focusable className={css.MainNumpadColumn} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
          {mainRows.map((row, index) => (
            <Focusable key={index} className={css.NumpadRow} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
              {row.map((key) => renderKey(keyProps(key, css)))}
            </Focusable>
          ))}
        </Focusable>
        <Focusable className={css.RightNumpadColumn} flow-children="column" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
          {rightColumn.map((key, index) => (
            <Focusable key={key.id} className={css.NumpadRow} flow-children="row" navEntryPreferPosition={FocusPreference.PREFERRED_CHILD}>
              {renderKey({ ...keyProps(key, css), style: { width: key.width, height: index === 0 ? 46 : 99 } })}
            </Focusable>
          ))}
        </Focusable>
      </Focusable>
    </Focusable>
  )
}
