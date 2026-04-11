import { toaster } from '@decky/api'
import { useEffect, useRef } from 'react'

type ToastSeverity = 'error' | 'warning' | 'success'

type DeckyToast = {
  title: string
  body: string
  severity: ToastSeverity
}

type DeckyToastNotice = DeckyToast & {
  activeKey: string
}

export function showDeckyToast({ title, body, severity }: DeckyToast) {
  toaster.toast({
    title,
    body,
    critical: severity === 'error',
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
