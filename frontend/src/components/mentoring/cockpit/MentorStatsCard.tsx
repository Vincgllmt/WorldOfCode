'use client'

import { useEffect, useState } from 'react'
import { getMentorStats, type MentorStats } from '@/lib/api/mentoring/stats'

function StarRating({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden="true" className="text-yellow-500">★</span>
      <span>{value.toFixed(1)}</span>
    </span>
  )
}

export default function MentorStatsCard() {
  const [stats, setStats] = useState<MentorStats | null>(null)

  useEffect(() => {
    getMentorStats().then(setStats).catch(() => {})
  }, [])

  if (!stats) {
    return <div className="animate-pulse h-24 bg-muted rounded-lg" aria-label="Chargement des stats..." />
  }

  const metrics: { label: string; value: React.ReactNode }[] = [
    { label: 'Sessions totales', value: stats.totalSessions },
    { label: 'Sessions actives', value: stats.activeSessions },
    { label: 'Note moyenne', value: <StarRating value={stats.averageRating} /> },
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
