import { DropdownItem, SliderField, ToggleField } from '@decky/ui'
import type { ComponentProps, ComponentType, ReactNode } from 'react'

type SteamExplainerProps = {
  explainer?: ReactNode
  explainerTitle?: ReactNode
}

export const SteamExplainerDropdownItem = DropdownItem as ComponentType<
  ComponentProps<typeof DropdownItem> & SteamExplainerProps & { controlled?: boolean }
>

export const SteamExplainerToggleField = ToggleField as ComponentType<
  ComponentProps<typeof ToggleField> & SteamExplainerProps
>

export const SteamExplainerSliderField = SliderField as ComponentType<
  ComponentProps<typeof SliderField> & SteamExplainerProps
>
