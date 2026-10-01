import { Navigation } from '@decky/ui'

export const DECKYZONE_ROUTE = '/deckyzone'
export const DECKYZONE_GENERAL_ROUTE = `${DECKYZONE_ROUTE}/general`
export const DECKYZONE_CONTROLLER_ROUTE = `${DECKYZONE_ROUTE}/controller`
export const DECKYZONE_MAPPING_ROUTE = `${DECKYZONE_CONTROLLER_ROUTE}/mapping`
export const DECKYZONE_CUSTOMIZATION_ROUTE = `${DECKYZONE_ROUTE}/customization`
export const DECKYZONE_DISPLAY_ROUTE = `${DECKYZONE_ROUTE}/display`
export const DECKYZONE_PERFORMANCE_ROUTE = `${DECKYZONE_ROUTE}/performance`
export const DECKYZONE_SPECIFICATIONS_ROUTE = `${DECKYZONE_ROUTE}/specifications`

export function openDeckyZoneSettings() {
  Navigation.Navigate(DECKYZONE_GENERAL_ROUTE)
  Navigation.CloseSideMenus()
}

export function controllerMappingRoute(appId = '0') {
  return `${DECKYZONE_MAPPING_ROUTE}/${appId}`
}

export function openControllerMapping(appId = '0') {
  Navigation.Navigate(controllerMappingRoute(appId))
  Navigation.CloseSideMenus()
}
