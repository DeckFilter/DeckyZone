import {
  DialogControlsSectionHeader,
  DialogSubHeader,
  findClassModule,
} from '@decky/ui'
import type { ComponentProps } from 'react'

type SettingsDialogSubHeaderProps = ComponentProps<typeof DialogSubHeader>

const settingsDialogClasses = findClassModule((classes) => (
  Boolean(classes.SettingsDialogSubHeader && classes.SettingsDialogBodyText)
))

const settingsDialogSubHeaderClass = settingsDialogClasses?.SettingsDialogSubHeader

const SettingsDialogSubHeader = ({
  className,
  ...props
}: SettingsDialogSubHeaderProps) => {
  if (!settingsDialogSubHeaderClass) {
    return <DialogControlsSectionHeader className={className} {...props} />
  }

  const mergedClassName = [settingsDialogSubHeaderClass, className]
    .filter(Boolean)
    .join(' ')

  return <DialogSubHeader {...props} className={mergedClassName} />
}

export default SettingsDialogSubHeader
