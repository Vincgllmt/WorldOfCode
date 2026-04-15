'use client'

import { useEffect, useState } from 'react'
import { getJuniorSessions } from '@/lib/api/mentoring/sessions'
import SessionCard from '@/components/mentoring/session/SessionCard'
import type { MentoringSession } from '@/types/mentoring'

export default function MySessionsPage() {
  const [sessions, setSessions] = useState<MentoringSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJuniorSessions().then(setSessions).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const activeSessions = sessions.filter(s => ['scheduled', 'in_progress'].includes(s.status))
  const completedSessions = sessions.filter(s => s.status === 'completed')

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mes sessions</h1>

      {activeSessions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Sessions actives
          </h2>
          <div className="space-y-3">
            {activeSessions.map(s => (
              <SessionCard key={s.id} session={s} viewAs="junior" />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Historique
        </h2>
        {completedSessions.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Aucune session terminée.</p>
        ) : (
          <div className="space-y-3">
            {completedSessions.map(s => (
              <SessionCard key={s.id} session={s} viewAs="junior" />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
