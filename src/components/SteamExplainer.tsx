import { DropdownItem, SliderField, ToggleField } from '@decky/ui'
import type { ComponentProps, ReactNode } from 'react'
import { getSettingsDescription, useSettingsSurface } from './SettingsSurface'

type SteamExplainerProps = {
  explainer?: ReactNode
  explainerTitle?: ReactNode
}

type SteamExplainerDropdownItemProps = ComponentProps<typeof DropdownItem>
  & SteamExplainerProps
  & { controlled?: boolean }

type SteamExplainerToggleFieldProps = ComponentProps<typeof ToggleField> & SteamExplainerProps
type SteamExplainerSliderFieldProps = ComponentProps<typeof SliderField> & SteamExplainerProps

export const SteamExplainerDropdownItem = (props: SteamExplainerDropdownItemProps) => {
  const surface = useSettingsSurface()
  if (surface === 'quick-access') {
    return <DropdownItem {...props} />
  }

  const { explainer, explainerTitle: _explainerTitle, description, ...dropdownProps } = props
  return (
    <DropdownItem
      {...dropdownProps}
      layout="inline"
      description={getSettingsDescription(explainer, description)}
    />
  )
}

export const SteamExplainerToggleField = (props: SteamExplainerToggleFieldProps) => {
  const surface = useSettingsSurface()
  if (surface === 'quick-access') {
    return <ToggleField {...props} />
  }

  const { explainer, explainerTitle: _explainerTitle, description, ...toggleProps } = props
  return (
    <ToggleField
      {...toggleProps}
      description={getSettingsDescription(explainer, description)}
    />
  )
}

export const SteamExplainerSliderField = (props: SteamExplainerSliderFieldProps) => {
  const surface = useSettingsSurface()
  if (surface === 'quick-access') {
    return <SliderField {...props} />
  }

  const { explainer, explainerTitle: _explainerTitle, description, ...sliderProps } = props
  return (
    <SliderField
      {...sliderProps}
      description={getSettingsDescription(explainer, description)}
    />
  )
}
