'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'woc_browser_notifications_enabled'

type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported'

type ShowNotificationOptions = {
  title: string
  body?: string
  icon?: string
  tag?: string
  onClick?: () => void
}

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

function getDefaultIcon(): string {
  if (typeof window === 'undefined') return '/logo-woc-square.png'
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? '/woc-square-dark.png' : '/logo-woc-square.png'
}

export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default')
  const [enabled, setEnabled] = useState(false)

  // Init : récupère l'état courant du navigateur + préférence utilisateur
  useEffect(() => {
    if (!isSupported()) {
      setPermission('unsupported')
      return
    }
    setPermission(Notification.permission as NotificationPermissionState)
    const stored = localStorage.getItem(STORAGE_KEY)
    setEnabled(stored === 'true' && Notification.permission === 'granted')
  }, [])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported()) return false
    try {
      const result = await Notification.requestPermission()
      setPermission(result as NotificationPermissionState)
      if (result === 'granted') {
        localStorage.setItem(STORAGE_KEY, 'true')
        setEnabled(true)
        return true
      }
      return false
    } catch {
      return false
    }
  }, [])

  const disable = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'false')
    setEnabled(false)
  }, [])

  const showNotification = useCallback(({ title, body, icon, tag, onClick }: ShowNotificationOptions) => {
    if (!isSupported() || !enabled || Notification.permission !== 'granted') return

    // Ne pas notifier si l'onglet est déjà visible et actif
    if (typeof document !== 'undefined' && document.visibilityState === 'visible' && document.hasFocus()) {
      return
    }

    try {
      const fallbackIcon = getDefaultIcon()
      const notif = new Notification(title, {
        body,
        icon: icon || fallbackIcon,
        tag,
        badge: fallbackIcon,
      })

      if (onClick) {
        notif.onclick = () => {
          window.focus()
          onClick()
          notif.close()
        }
      }

      // Auto-close après 8s pour éviter l'accumulation
      setTimeout(() => notif.close(), 8000)
    } catch (err) {
      console.warn('Erreur notification navigateur:', err)
    }
  }, [enabled])

  return {
    permission,
    enabled,
    isSupported: isSupported(),
    requestPermission,
    disable,
    showNotification,
  }
}
