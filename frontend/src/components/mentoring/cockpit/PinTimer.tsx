'use client'

import { useState, useEffect, useRef } from 'react'

interface Props {
  expiresAt: string
  onExpired?: () => void
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':')
}

export default function PinTimer({ expiresAt, onExpired }: Props) {
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
  )
  const onExpiredRef = useRef(onExpired)
  useEffect(() => { onExpiredRef.current = onExpired }, [onExpired])

  // Redémarre l'intervalle uniquement quand expiresAt change (pas à chaque render parent)
  useEffect(() => {
    const initial = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    setRemaining(initial)
    if (initial <= 0) return
    const interval = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  // Callback expiré séparé du state updater (évite double-appel en StrictMode)
  useEffect(() => {
    if (remaining <= 0) {
      onExpiredRef.current?.()
    }
  }, [remaining])

  if (remaining <= 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <span aria-hidden="true">⏰</span>
        <span>Pin expiré</span>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
      <span aria-hidden="true">📌</span>
      <span>Expire dans {formatCountdown(remaining)}</span>
    </span>
  )
}
