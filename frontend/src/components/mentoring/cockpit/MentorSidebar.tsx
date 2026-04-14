'use client'

import MentorStatsCard from './MentorStatsCard'
import PinTimer from './PinTimer'
import type { MentoringRequest } from '@/types/mentoring'

interface Props {
  pinnedRequests?: MentoringRequest[]
}

export default function MentorSidebar({ pinnedRequests = [] }: Props) {
  return (
    <div className="p-4 space-y-6">
      <MentorStatsCard />

      {/* Sessions actives — complété en story 12.3 */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Sessions actives
        </h3>
        <p className="text-xs text-muted-foreground">Aucune session active</p>
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
