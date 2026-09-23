import { Navigation } from '@decky/ui'

export const DECKYZONE_ROUTE = '/deckyzone'
export const DECKYZONE_GENERAL_ROUTE = `${DECKYZONE_ROUTE}/general`
export const DECKYZONE_CONTROLLER_ROUTE = `${DECKYZONE_ROUTE}/controller`
export const DECKYZONE_INTERFACE_ROUTE = `${DECKYZONE_ROUTE}/interface`
export const DECKYZONE_DISPLAY_ROUTE = `${DECKYZONE_ROUTE}/display`
export const DECKYZONE_PERFORMANCE_ROUTE = `${DECKYZONE_ROUTE}/performance`

export function openDeckyZoneSettings() {
  Navigation.Navigate(DECKYZONE_GENERAL_ROUTE)
  Navigation.CloseSideMenus()
}
