import { Dropdown, findModule, findModuleExport, Focusable, type FocusableProps, IconsModule, SidebarNavigation } from '@decky/ui'
import type { ComponentProps, ComponentType, ReactNode, Ref } from 'react'

export type NavHandle = {
  TakeFocus: (direction?: number) => boolean
  ParentTakeFocus: (direction?: number) => boolean
  BHasFocus: () => boolean
}
export const MappingFocusable = Focusable as ComponentType<FocusableProps & {
  focusable?: boolean
  autoFocus?: boolean
  navRef?: Ref<NavHandle | null>
}>

export const MappingSidebar = SidebarNavigation as ComponentType<ComponentProps<typeof SidebarNavigation> & {
  eInitialFocus?: number
}>

export const MappingDropdown = Dropdown as ComponentType<ComponentProps<typeof Dropdown> & { controlled?: boolean }>

export const sidebarFocus = findModuleExport((value) => (
  typeof value?.k_EPagedSettingsInitialFocus_PageContent === 'number'
)) as { k_EPagedSettingsInitialFocus_PageContent: number } | undefined

export const MappingFocusGroup = findModuleExport((value) => {
  const source = value?.render?.toString()
  return source?.includes('onExplicitFocusLevelChanged') && source.includes('navRefPanel')
}) as typeof MappingFocusable | undefined

export function getMappingUi() {
  const glyphClasses = findModule((m) => typeof m?.SectionGlyph === 'string' && typeof m?.ControllerIcon === 'string')
  const Section = findModuleExport((value) => (
    typeof value === 'function' && value.toString().includes('"DialogSettingsSection"')
  )) as ComponentType<{ label: ReactNode; children: ReactNode }> | undefined
  const bindingClasses: Record<string, string> = findModule((m) => (
    typeof m?.BindingButtons === 'string'
    && typeof m?.BindingButton === 'string'
    && typeof m?.BindingOptionsButton === 'string'
  )) ?? {}
  const classes: Record<string, string> = findModule((m) => (
    typeof m?.ChooseBindingContainer === 'string'
    && typeof m?.CardinalButtonGroup === 'string'
    && typeof m?.KeyboardKey === 'string'
  )) ?? {}
  const Page = findModuleExport((value) => {
    const source = value?.render?.toString()
    return source?.includes('dialogContentPadding') && source.includes('GamepadPageDialogContent')
  }) as ComponentType<{
    children: ReactNode
    scrollable: boolean
    dialogContentPadding: string
    contentMaxWidth: string
    headerVisibility: string
  }> | undefined
  return { classes, bindingClasses, glyphClass: glyphClasses?.SectionGlyph as string | undefined, Page, Section }
}

export const ABXYButton = IconsModule?.ABXYButton as ComponentType<{ button: string }> | undefined
export const DirectionalButton = IconsModule?.DirectionalButton as ComponentType<{ direction: string }> | undefined
export const Carat = IconsModule?.Carat as ComponentType<{ direction: string }> | undefined
export const SettingsIcon = IconsModule?.Settings as ComponentType | undefined
export const GenericGamepad = IconsModule?.GenericGamepad as ComponentType<{ className?: string; 'aria-hidden'?: boolean }> | undefined
