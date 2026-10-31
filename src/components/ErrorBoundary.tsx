import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import RetryField from './RetryField'
import { SettingsSection } from './SettingsSurface'

type Props = {
  title?: string
  children: ReactNode
}

type State = {
  hasError: boolean
}

class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error) {
    console.log(error)
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.log(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <SettingsSection title={this.props.title ?? 'DeckyZone'}>
          <RetryField
            message={this.props.title ? `Couldn't load ${this.props.title.toLowerCase()}` : "Couldn't load this panel"}
            onRetry={() => this.setState({ hasError: false })}
          />
        </SettingsSection>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
