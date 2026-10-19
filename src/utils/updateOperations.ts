import { useSyncExternalStore } from 'react'

let activeOperation: symbol | null = null
const listeners = new Set<() => void>()
const getBusy = () => activeOperation !== null
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
const emit = () => { [...listeners].forEach((listener) => listener()) }

// All mounted settings surfaces share this lease, including across panel unmounts.
export const beginUpdateOperation = (): (() => void) | null => {
  if (activeOperation !== null) return null
  const operation = Symbol('update-operation')
  activeOperation = operation
  emit()
  let released = false
  return () => {
    if (released) return
    released = true
    if (activeOperation === operation) {
      activeOperation = null
      emit()
    }
  }
}

export const useUpdateOperationBusy = (): boolean => useSyncExternalStore(subscribe, getBusy, getBusy)
