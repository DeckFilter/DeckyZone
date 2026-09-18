import { DialogButton, Focusable, quickAccessMenuClasses } from '@decky/ui'
import type { CSSProperties } from 'react'
import { FaInfoCircle } from 'react-icons/fa'
import { openDebugInformation } from '../routes'

const buttonStyle: CSSProperties = {
  height: '28px',
  width: '40px',
  minWidth: 0,
  padding: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
}

type Props = {
  title: string
}

const QuickAccessTitleView = ({ title }: Props) => {
  return (
    <Focusable
      style={{
        display: 'flex',
        padding: '0',
        flex: 'auto',
        boxShadow: 'none',
      }}
      className={quickAccessMenuClasses.Title}
    >
      <div style={{ marginRight: 'auto' }}>{title}</div>
      <DialogButton
        onOKActionDescription="Debug Information"
        style={buttonStyle}
        onClick={openDebugInformation}
      >
        <FaInfoCircle size="0.9em" />
      </DialogButton>
    </Focusable>
  )
}

export default QuickAccessTitleView
