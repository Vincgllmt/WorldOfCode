'use client'

import MentorStatsCard from './MentorStatsCard'
import PinTimer from './PinTimer'
import type { MentoringRequest, MentoringSession } from '@/types/mentoring'

const FORMAT_LABEL: Record<string, string> = {
  text: '💬 Texte',
  video: '📹 Vidéo',
  hybrid: '🔀 Hybride',
}

interface Props {
  pinnedRequests?: MentoringRequest[]
  activeSessions?: MentoringSession[]
}

export default function MentorSidebar({ pinnedRequests = [], activeSessions = [] }: Props) {
  return (
    <div className="p-4 space-y-6">
      <MentorStatsCard />

      {/* Sessions actives */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Sessions actives
        </h3>
        {activeSessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune session active</p>
        ) : (
          <div className="space-y-2">
            {activeSessions.map(s => (
              <div key={s.id} className="p-2 bg-muted/40 rounded-lg space-y-1">
                <p className="text-xs font-medium truncate">{s.junior.username}</p>
                <p className="text-xs text-muted-foreground">{FORMAT_LABEL[s.format] ?? s.format}</p>
                {s.conversationId ? (
                  <a
                    href={`/message/${s.conversationId}`}
                    className="text-xs text-primary underline"
                  >
                    Ouvrir le chat
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Session créée. Lien chat à ajouter manuellement.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demandes épinglées */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
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
