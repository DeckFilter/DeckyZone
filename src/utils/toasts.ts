import { toaster } from '@decky/api'
import { useEffect, useRef, createElement } from 'react'
import ZotacIcon from '../components/ZotacIcon'

type ToastSeverity = 'error' | 'warning' | 'success'

type DeckyToast = {
  title: string
  body: string
  severity: ToastSeverity
}

type DeckyToastNotice = DeckyToast & {
  activeKey: string
}

const TOAST_LOGO_FRAME_STYLE = {
  width: '40px',
  height: '40px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
} as const

export function showDeckyToast({ title, body, severity }: DeckyToast) {
  toaster.toast({
    title,
    body,
    critical: severity === 'error',
    logo: createElement(
      'div',
      {
        style: TOAST_LOGO_FRAME_STYLE,
      },
      createElement(ZotacIcon, { size: '1.5rem' }),
    ),
  })
}

export function useDeckyToastNotice(notice: DeckyToastNotice | null) {
  const lastActiveKeyRef = useRef<string | null>(null)

  useEffect(() => {
    if (!notice) {
      lastActiveKeyRef.current = null
      return
    }

    if (lastActiveKeyRef.current === notice.activeKey) {
      return
    }

    lastActiveKeyRef.current = notice.activeKey
    showDeckyToast(notice)
  }, [notice?.activeKey, notice?.body, notice?.severity, notice?.title])
}
