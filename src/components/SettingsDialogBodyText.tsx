import { DialogBodyText, findClassModule } from '@decky/ui'
import type { ComponentProps } from 'react'

type SettingsDialogBodyTextProps = ComponentProps<typeof DialogBodyText>

const settingsDialogClasses = findClassModule((classes) => (
  Boolean(classes.SettingsDialogSubHeader && classes.SettingsDialogBodyText)
))

const settingsDialogBodyTextClass = settingsDialogClasses?.SettingsDialogBodyText

const SettingsDialogBodyText = ({
  className,
  ...props
}: SettingsDialogBodyTextProps) => {
  const mergedClassName = [settingsDialogBodyTextClass, className]
    .filter(Boolean)
    .join(' ')

  return <DialogBodyText {...props} className={mergedClassName} />
}

export default SettingsDialogBodyText
