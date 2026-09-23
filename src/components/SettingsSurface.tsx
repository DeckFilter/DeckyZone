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
  spinner?: boolean
}

export const SettingsSection = ({ children, title, spinner = false }: SettingsSectionProps) => {
  const surface = useSettingsSurface()

  if (surface === 'quick-access') {
    return (
      <PanelSection title={title} spinner={spinner}>
        {children}
      </PanelSection>
    )
  }

  return (
    <DialogControlsSection>
      <SettingsDialogSubHeader>
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {title}
          {spinner && <Spinner width="18px" height="18px" />}
        </span>
      </SettingsDialogSubHeader>
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

export function getSettingsDescription(explainer: ReactNode, description?: ReactNode) {
  if (!description) {
    return explainer
  }

  return (
    <>
      {explainer}
      <br />
      {description}
    </>
  )
}
