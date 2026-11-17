import { ButtonItem } from '@decky/ui'
import { SettingsRow, useSettingsItemLayout } from './SettingsSurface'

type Props = {
  message: string
  onRetry: () => void
  disabled?: boolean
}

const RetryField = ({ message, onRetry, disabled = false }: Props) => (
  <SettingsRow>
    <ButtonItem label={message} layout={useSettingsItemLayout()} disabled={disabled} onClick={onRetry}>
      Retry
    </ButtonItem>
  </SettingsRow>
)

export default RetryField
