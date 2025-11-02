import { useEffect, useCallback } from 'react'

export interface Shortcut {
  key: string
  altKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  handler: (event: KeyboardEvent) => void
  preventDefault?: boolean
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignore if user is typing in input/textarea (except for '/')
    const target = event.target as HTMLElement
    if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) && event.key !== '/') {
      return
    }

    for (const shortcut of shortcuts) {
      const { key, altKey, ctrlKey, shiftKey, handler, preventDefault = true } = shortcut

      if (
        event.key === key &&
        (altKey === undefined || event.altKey === altKey) &&
        (ctrlKey === undefined || event.ctrlKey === ctrlKey) &&
        (shiftKey === undefined || event.shiftKey === shiftKey)
      ) {
        if (preventDefault) {
          event.preventDefault()
        }
        handler(event)
        return // Only trigger one shortcut per keydown
      }
    }
  }, [shortcuts])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
