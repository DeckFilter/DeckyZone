import {
  DialogControlsSection,
  PanelSection,
  PanelSectionRow,
  Spinner,
} from '@decky/ui'
import { createContext, Fragment, type ReactNode, useContext } from 'react'
import SettingsDialogSubHeader from './SettingsDialogSubHeader'

export type SettingsSurface = 'quick-access' | 'settings'

const SettingsSurfaceContext = createContext<SettingsSurface>('quick-access')

type SettingsSurfaceProviderProps = {
  children: ReactNode
  surface: SettingsSurface
}

export const SettingsSurfaceProvider = ({ children, surface }: SettingsSurfaceProviderProps) => (
  <SettingsSurfaceContext.Provider value={surface}>
    {children}
  </SettingsSurfaceContext.Provider>
)

export const useSettingsSurface = () => useContext(SettingsSurfaceContext)

export const useSettingsItemLayout = () => (
  useSettingsSurface() === 'quick-access' ? 'below' : 'inline'
)

type SettingsSectionProps = {
  children: ReactNode
  title: string
  settingsTitle?: ReactNode | null
  spinner?: boolean
}

const SettingsHeader = ({ children, spinner = false }: { children: ReactNode; spinner?: boolean }) => (
  <SettingsDialogSubHeader>
    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      {children}
      {spinner && <Spinner width="18px" height="18px" />}
    </span>
  </SettingsDialogSubHeader>
)

export const SettingsSection = ({
  children,
  title,
  settingsTitle,
  spinner = false,
}: SettingsSectionProps) => {
  const surface = useSettingsSurface()

  if (surface === 'quick-access') {
    return (
      <PanelSection title={title} spinner={spinner}>
        {children}
      </PanelSection>
    )
  }

  const resolvedSettingsTitle = settingsTitle === undefined ? title : settingsTitle

  return (
    <DialogControlsSection>
      {resolvedSettingsTitle !== null && (
        <SettingsHeader spinner={spinner}>{resolvedSettingsTitle}</SettingsHeader>
      )}
      {children}
    </DialogControlsSection>
  )
}

type SettingsPanelProps = {
  children: ReactNode
  title: string
  spinner?: boolean
}

export const SettingsPanel = ({ children, title, spinner = false }: SettingsPanelProps) => {
  const surface = useSettingsSurface()

  return surface === 'quick-access'
    ? <PanelSection title={title} spinner={spinner}>{children}</PanelSection>
    : <Fragment>{children}</Fragment>
}

type SettingsGroupProps = {
  children: ReactNode
  title?: ReactNode
}

export const SettingsGroup = ({ children, title }: SettingsGroupProps) => {
  const surface = useSettingsSurface()

  if (surface === 'quick-access') {
    return <Fragment>{children}</Fragment>
  }

  return (
    <DialogControlsSection>
      {title !== undefined && <SettingsHeader>{title}</SettingsHeader>}
      {children}
    </DialogControlsSection>
  )
}

export const SettingsRow = ({ children }: { children: ReactNode }) => {
  const surface = useSettingsSurface()
  return surface === 'quick-access'
    ? <PanelSectionRow>{children}</PanelSectionRow>
    : <Fragment>{children}</Fragment>
}
