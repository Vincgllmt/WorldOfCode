'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import UserSettingsModal from '@/components/profile/UserSettingsModal'
import { useAuth } from '@/hooks/useAuth'

type SettingsTab = 'profile' | 'password' | 'notifications'

type SettingsModalContextValue = {
  openSettings: (tab?: SettingsTab) => void
  closeSettings: () => void
}

const SettingsModalContext = createContext<SettingsModalContextValue | null>(null)

export function SettingsModalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<SettingsTab>('profile')

  const openSettings = useCallback((tab: SettingsTab = 'profile') => {
    setInitialTab(tab)
    setOpen(true)
  }, [])

  const closeSettings = useCallback(() => setOpen(false), [])

  return (
    <SettingsModalContext.Provider value={{ openSettings, closeSettings }}>
      {children}
      {user && (
        <UserSettingsModal
          userId={user.id}
          open={open}
          onOpenChange={setOpen}
          initialTab={initialTab}
        />
      )}
    </SettingsModalContext.Provider>
  )
}

export function useSettingsModal(): SettingsModalContextValue {
  const ctx = useContext(SettingsModalContext)
  if (!ctx) {
    throw new Error('useSettingsModal must be used inside SettingsModalProvider')
  }
  return ctx
}
