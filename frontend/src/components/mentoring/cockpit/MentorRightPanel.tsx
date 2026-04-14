'use client'

import { useState, useEffect } from 'react'
import { getMentorRequestDetail } from '@/lib/api/mentoring/requests'
import CompatibilityScore from '../feed/CompatibilityScore'
import type { MentoringRequest } from '@/types/mentoring'

interface SessionEntry {
  id: number
  status: string
  format: string
  completedAt: string | null
}

interface RequestDetail {
  description: string
  alreadyTried: string | null
  expectedBehavior: string | null
  observedBehavior: string | null
  juniorContext?: {
    previousSessions: SessionEntry[]
  }
}

interface Props {
  request: MentoringRequest
}

export default function MentorRightPanel({ request }: Props) {
  const [detail, setDetail] = useState<RequestDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getMentorRequestDetail(request.id)
      .then((d: RequestDetail) => setDetail(d))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [request.id])

  return (
    <div className="p-4 space-y-6 overflow-y-auto h-full">
      {/* Header junior */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-medium shrink-0">
          {request.junior.username[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-semibold">{request.junior.username}</p>
          <p className="text-xs text-muted-foreground">{request.techStack}</p>
        </div>
      </div>

      {/* Score compatibilité */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Compatibilité
        </h4>
        <CompatibilityScore score={request.compatibilityScore} />
      </div>

      {/* Détails de la demande */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          La demande
        </h4>
        <h3 className="font-medium text-sm mb-1">{request.title}</h3>
        <p className="text-sm text-muted-foreground">
          {detail?.description ?? request.descriptionExcerpt ?? request.description}
        </p>

        {detail?.alreadyTried && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">Déjà essayé :</p>
            <p className="text-sm">{detail.alreadyTried}</p>
          </div>
        )}
        {detail?.expectedBehavior && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">Comportement attendu :</p>
            <p className="text-sm">{detail.expectedBehavior}</p>
          </div>
        )}
        {detail?.observedBehavior && (
          <div className="mt-3">
            <p className="text-xs font-medium text-muted-foreground">Comportement observé :</p>
            <p className="text-sm">{detail.observedBehavior}</p>
          </div>
        )}
      </div>

      {/* Sessions précédentes — skeleton pendant chargement */}
      {loading && (
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
          <div className="h-10 bg-muted/40 rounded-lg animate-pulse" />
        </div>
      )}

      {!loading && (detail?.juniorContext?.previousSessions?.length ?? 0) > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
            Sessions précédentes
          </h4>
          <div className="space-y-2">
            {detail!.juniorContext!.previousSessions.map((s) => (
              <div key={s.id} className="text-xs p-2 bg-muted/40 rounded-lg flex justify-between">
                <span className="capitalize">{s.status.replace('_', ' ')}</span>
                {s.completedAt && (
                  <span className="text-muted-foreground">
                    {new Date(s.completedAt).toLocaleDateString('fr-FR')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && (detail?.juniorContext?.previousSessions?.length ?? 0) === 0 && detail !== null && (
        <p className="text-xs text-muted-foreground">Aucune session précédente avec ce junior.</p>
      )}
    </div>
  )
}
