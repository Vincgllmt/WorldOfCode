'use client'

import MentorStatsCard from './MentorStatsCard'

export default function MentorSidebar() {
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

      {/* Épingles actives — complété en story 10.5 */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Demandes épinglées
        </h3>
        <p className="text-xs text-muted-foreground">Aucune demande épinglée</p>
      </div>
    </div>
  )
}
