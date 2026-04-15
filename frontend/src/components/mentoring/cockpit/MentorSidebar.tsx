'use client'

import { useEffect, useState } from 'react'
import MentorStatsCard from './MentorStatsCard'
import PinTimer from './PinTimer'
import SessionMiniCard from './SessionMiniCard'
import WeekAgenda from './WeekAgenda'
import { startSession } from '@/lib/api/mentoring/sessions'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { MentoringRequest, MentoringSession } from '@/types/mentoring'

interface Follower {
  id: number
  username: string
}

interface Props {
  pinnedRequests?: MentoringRequest[]
  activeSessions?: MentoringSession[]
  onSessionUpdate?: () => void
}

export default function MentorSidebar({ pinnedRequests = [], activeSessions = [], onSessionUpdate }: Props) {
  const [followers, setFollowers] = useState<Follower[]>([])

  useEffect(() => {
    fetchWithAuth('/api/mentor/followers')
      .then(r => r.ok ? r.json() : [])
      .then((data: Follower[]) => setFollowers(data))
      .catch(() => {})
  }, [])

  const handleStart = async (id: number) => {
    try {
      await startSession(id)
      onSessionUpdate?.()
    } catch {}
  }

  return (
    <div className="p-4 space-y-6">
      <MentorStatsCard />

      <WeekAgenda sessions={activeSessions} />

      {/* Sessions actives */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Sessions actives ({activeSessions.length})
        </h3>
        {activeSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune session active</p>
        ) : (
          <div className="space-y-1">
            {activeSessions.map(s => (
              <SessionMiniCard key={s.id} session={s} onStart={handleStart} onComplete={() => onSessionUpdate?.()} />
            ))}
          </div>
        )}
      </div>

      {/* Abonnés */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Abonnés ({followers.length})
        </h3>
        {followers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucun abonné pour l'instant</p>
        ) : (
          <div className="space-y-1">
            {followers.map(f => (
              <div key={f.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary shrink-0">
                  {f.username[0]?.toUpperCase()}
                </div>
                <span className="text-xs truncate">{f.username}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demandes épinglées */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Demandes épinglées
        </h3>
        {pinnedRequests.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune demande épinglée</p>
        ) : (
          <div className="space-y-2">
            {pinnedRequests.map(r => (
              <div key={r.id} className="p-2 bg-muted/40 rounded-lg space-y-1">
                <p className="text-xs font-medium truncate">{r.title}</p>
                {r.pin?.isActive && (
                  <PinTimer expiresAt={r.pin.expiresAt} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
