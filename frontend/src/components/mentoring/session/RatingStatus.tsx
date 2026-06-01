'use client'

import { useEffect, useState } from 'react'
import { getSessionRatings } from '@/lib/api/mentoring/ratings'

interface RatingEntry {
  id: number
  score: number
  comment: string | null
  isVisible: boolean
  submittedAt: string | null
  rater: { id: number; username: string }
  ratee: { id: number; username: string }
}

interface PendingData {
  status: 'pending'
  submitted: number
  total: number
}

type RatingsData = PendingData | RatingEntry[]

function StarDisplay({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${score} étoile${score > 1 ? 's' : ''} sur 5`}>
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          aria-hidden="true"
          className={score >= star ? 'text-yellow-400' : 'text-muted-foreground/30'}
        >
          ★
        </span>
      ))}
    </div>
  )
}

interface Props {
  sessionId: number
  currentUserId: number
  onRate: () => void
}

export default function RatingStatus({ sessionId, currentUserId, onRate }: Props) {
  const [data, setData] = useState<RatingsData | null>(null)

  useEffect(() => {
    getSessionRatings(sessionId).then((d: RatingsData) => setData(d)).catch(() => {})
  }, [sessionId])

  if (!data) return null

  if (!Array.isArray(data) && data.status === 'pending') {
    return (
      <div className="p-4 bg-muted/40 rounded-lg">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <span aria-hidden="true">⏳</span>
          <span>Notation en cours ({data.submitted}/{data.total} soumises)</span>
        </div>
        <button
          type="button"
          onClick={onRate}
          className="text-sm text-primary hover:underline"
        >
          Soumettre ma note →
        </button>
      </div>
    )
  }

  if (Array.isArray(data)) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <span aria-hidden="true">★</span> Notes de la session
        </h4>
        {data.map(rating => (
          <div key={rating.id} className="p-3 bg-muted/40 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">
                {rating.rater.id === currentUserId ? 'Votre note' : `Note de ${rating.rater.username}`}
              </span>
              <StarDisplay score={rating.score} />
            </div>
            {rating.comment && (
              <p className="text-sm text-muted-foreground">{rating.comment}</p>
            )}
          </div>
        ))}
      </div>
    )
  }

  return null
}
