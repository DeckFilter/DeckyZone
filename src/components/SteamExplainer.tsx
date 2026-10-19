import { DropdownItem } from '@decky/ui'
import type { ComponentProps, ReactNode } from 'react'
import { useSettingsSurface } from './SettingsSurface'

type SteamExplainerProps = {
  settingsDescription?: ReactNode
}

type SteamExplainerDropdownItemProps = ComponentProps<typeof DropdownItem>
  & SteamExplainerProps
  & { controlled?: boolean }

export const SteamExplainerDropdownItem = ({
  settingsDescription,
  ...props
}: SteamExplainerDropdownItemProps) => {
  const surface = useSettingsSurface()
  if (surface === 'quick-access') {
    return <DropdownItem {...props} />
  }

  return (
    <DropdownItem
      childrenContainerWidth="fixed"
      {...props}
      layout="inline"
      description={props.description ?? settingsDescription}
    />
  )
}
