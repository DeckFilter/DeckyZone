import { Navigation } from '@decky/ui'

export const DECKYZONE_ROUTE = '/deckyzone'
export const DECKYZONE_OVERVIEW_ROUTE = `${DECKYZONE_ROUTE}/overview`
export const DECKYZONE_INPUT_ROUTE = `${DECKYZONE_ROUTE}/input`
export const DECKYZONE_DISPLAY_ROUTE = `${DECKYZONE_ROUTE}/display`
export const DECKYZONE_SUPPORT_REPORT_ROUTE = `${DECKYZONE_ROUTE}/support-report`

export function openDebugInformation() {
  Navigation.Navigate(DECKYZONE_OVERVIEW_ROUTE)
  Navigation.CloseSideMenus()
}
