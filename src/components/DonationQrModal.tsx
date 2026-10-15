import { ConfirmModal, DialogBodyText, showModal } from '@decky/ui'
import { QRCodeSVG } from 'qrcode.react'
import type { DonationProvider } from '../utils/donations'

type Props = {
  provider: DonationProvider
  closeModal?: () => void
}

const DonationQrModal = ({ provider, closeModal }: Props) => (
  <ConfirmModal
    strTitle={provider.name}
    strOKButtonText="Close"
    bAlertDialog
    closeModal={closeModal}
    onOK={closeModal}
    onCancel={closeModal}
    onEscKeypress={closeModal}
  >
    <DialogBodyText>Scan this code on your phone to open the donation page.</DialogBodyText>
    <QRCodeSVG
      value={provider.url}
      title={`${provider.name} donation link`}
      size={256}
      marginSize={4}
      bgColor="#ffffff"
      fgColor="#000000"
      style={{ display: 'block', width: 'min(256px, 32vh)', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
    />
    <DialogBodyText style={{ textAlign: 'center', overflowWrap: 'anywhere', marginTop: '16px' }}>
      {provider.url}
    </DialogBodyText>
  </ConfirmModal>
)

export const showDonationQrModal = (provider: DonationProvider) => (
  showModal(<DonationQrModal provider={provider} />)
)

export default DonationQrModal
