'use client'

import { useState, useEffect } from 'react'

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

  useEffect(() => {
    if (remaining <= 0) {
      onExpired?.()
      return
    }
    const interval = setInterval(() => {
      setRemaining(prev => {
        const next = prev - 1
        if (next <= 0) {
          clearInterval(interval)
          onExpired?.()
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [expiresAt, onExpired])

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
