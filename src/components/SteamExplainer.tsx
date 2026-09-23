import { ButtonItem, DropdownItem, SliderField, ToggleField } from '@decky/ui'
import type { ComponentProps, ReactNode } from 'react'
import { useSettingsSurface } from './SettingsSurface'

type SteamExplainerProps = {
  explainer?: ReactNode
  explainerTitle?: ReactNode
  settingsDescription?: ReactNode
}

type SteamExplainerDropdownItemProps = ComponentProps<typeof DropdownItem>
  & SteamExplainerProps
  & { controlled?: boolean }

type SteamExplainerToggleFieldProps = ComponentProps<typeof ToggleField> & SteamExplainerProps
type SteamExplainerSliderFieldProps = ComponentProps<typeof SliderField> & SteamExplainerProps
type SteamExplainerButtonItemProps = ComponentProps<typeof ButtonItem> & SteamExplainerProps

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
      {...props}
      layout="inline"
      description={props.description ?? settingsDescription}
    />
  )
}

export const SteamExplainerToggleField = ({
  settingsDescription,
  ...props
}: SteamExplainerToggleFieldProps) => {
  const surface = useSettingsSurface()
  if (surface === 'quick-access') {
    return <ToggleField {...props} />
  }

  return (
    <ToggleField
      {...props}
      description={props.description ?? settingsDescription}
    />
  )
}

export const SteamExplainerSliderField = ({
  settingsDescription,
  ...props
}: SteamExplainerSliderFieldProps) => {
  const surface = useSettingsSurface()
  if (surface === 'quick-access') {
    return <SliderField {...props} />
  }

  return (
    <SliderField
      {...props}
      description={props.description ?? settingsDescription}
    />
  )
}

export const SteamExplainerButtonItem = ({
  settingsDescription,
  ...props
}: SteamExplainerButtonItemProps) => {
  const surface = useSettingsSurface()
  if (surface === 'quick-access') {
    return <ButtonItem {...props} />
  }

  return (
    <ButtonItem
      {...props}
      description={props.description ?? settingsDescription}
    />
  )
}
