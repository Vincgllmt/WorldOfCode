'use client'

import { useEffect, useState } from 'react'
import { getMentorStats, type MentorStats } from '@/lib/api/mentoring/stats'

function Stars({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(i => {
        const filled = value >= i
        const half = !filled && value >= i - 0.5
        return (
          <span key={i} className="relative inline-block leading-none text-2xl">
            <span className="text-muted-foreground/30">★</span>
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden text-yellow-400"
                style={{ width: filled ? '100%' : '50%' }}
              >
                ★
              </span>
            )}
          </span>
        )
      })}
    </span>
  )
}

export default function MentorStatsCard() {
  const [stats, setStats] = useState<MentorStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getMentorStats().then(setStats).catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive flex items-center gap-1">
        <span aria-hidden="true">⚠</span> Impossible de charger les statistiques.
      </p>
    )
  }

  if (!stats) {
    return <div className="animate-pulse h-24 bg-muted rounded-lg" aria-label="Chargement des stats..." />
  }

  const metrics: { label: string; value: React.ReactNode }[] = [
    { label: 'Sessions totales', value: stats.totalSessions },
    { label: 'Sessions actives', value: stats.activeSessions },
    { label: 'Juniors aidés', value: stats.totalMentees },
    {
      label: 'Fiabilité',
      value: stats.reliabilityRate !== null
        ? `${Math.round(stats.reliabilityRate * 100)}%`
        : '—',
    },
  ]

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Mes stats
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {/* Carte Note moyenne : label + chiffre sur la même ligne, étoiles en dessous */}
        <div className="bg-muted/40 rounded-lg p-2.5 col-span-2" aria-label={`Note moyenne : ${stats.averageRating?.toFixed(1) ?? '—'} étoiles sur 5`}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Note moyenne</p>
            <p className="text-sm font-semibold tabular-nums">
              {stats.averageRating !== null ? stats.averageRating.toFixed(1) : '—'}
            </p>
          </div>
          {stats.averageRating !== null
            ? <Stars value={stats.averageRating} />
            : <span className="text-lg font-semibold text-muted-foreground">—</span>
          }
        </div>
        {metrics.map(m => (
          <div key={m.label} className="bg-muted/40 rounded-lg p-2.5">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className="text-lg font-semibold">{m.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
