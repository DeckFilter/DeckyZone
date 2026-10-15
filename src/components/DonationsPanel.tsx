import { DialogBodyText, DialogButton, Field, Focusable, Navigation } from '@decky/ui'
import { FaQrcode } from 'react-icons/fa'
import { DONATION_PROVIDERS } from '../utils/donations'
import { showDonationQrModal } from './DonationQrModal'
import { SettingsRow, SettingsSection, useSettingsSurface } from './SettingsSurface'

const openDonationPage = (url: string) => {
  Navigation.NavigateToExternalWeb(url)
  Navigation.CloseSideMenus()
}

const DonationsPanel = () => {
  const surface = useSettingsSurface()

  return (
    <SettingsSection title="Donations" settingsTitle={null}>
      {surface === 'quick-access' && (
        <SettingsRow>
          <DialogBodyText>DeckyZone is free. Donations support continued development.</DialogBodyText>
        </SettingsRow>
      )}
      {DONATION_PROVIDERS.map((provider) => {
        const Icon = provider.icon
        const showQrCode = () => showDonationQrModal(provider)
        const qrLabel = `Show ${provider.name} QR Code`

        return (
          <SettingsRow key={provider.id}>
            <Field
              label={null}
              bottomSeparator="none"
              childrenContainerWidth="max"
              inlineWrap="keep-inline"
              padding={surface === 'quick-access' ? 'standard' : 'compact'}
            >
              <Focusable flow-children="horizontal" style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <DialogButton
                  onClick={() => openDonationPage(provider.url)}
                  onOKActionDescription={`Open ${provider.name}`}
                  onSecondaryButton={showQrCode}
                  onSecondaryActionDescription={qrLabel}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '8px',
                    flex: 1,
                    minWidth: 0,
                    padding: '10px 8px',
                  }}
                >
                  <Icon size="1.25em" color={provider.color} aria-hidden="true" style={{ flexShrink: 0 }} />
                  {provider.name}
                </DialogButton>
                <DialogButton
                  aria-label={qrLabel}
                  onClick={showQrCode}
                  onOKActionDescription={qrLabel}
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flex: '0 0 40px',
                    minWidth: 0,
                    padding: 0,
                  }}
                >
                  <FaQrcode aria-hidden="true" />
                </DialogButton>
              </Focusable>
            </Field>
          </SettingsRow>
        )
      })}
    </SettingsSection>
  )
}

export default DonationsPanel
