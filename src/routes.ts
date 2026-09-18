import { Navigation } from '@decky/ui'

export const DECKYZONE_ROUTE = '/deckyzone'
export const DECKYZONE_SYSTEM_ROUTE = `${DECKYZONE_ROUTE}/system`
export const DECKYZONE_INPUT_ROUTE = `${DECKYZONE_ROUTE}/input`
export const DECKYZONE_DISPLAY_ROUTE = `${DECKYZONE_ROUTE}/display`

export function openSystemInformation() {
  Navigation.Navigate(DECKYZONE_SYSTEM_ROUTE)
  Navigation.CloseSideMenus()
}
