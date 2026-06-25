'use client'

import { useEffect, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'

interface ActivityEvent {
  type: string
  mentor: { id: number; username: string }
  message: string
  createdAt: string
}

interface FeedMeta {
  page: number
  limit: number
  total: number
}

const EVENT_ICONS: Record<string, string> = {
  new_session:     '🎯',
  availability_on: '✓',
}

export default function FollowingFeedPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [meta, setMeta] = useState<FeedMeta | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth('/mentoring/feed/following')
      .then(r => r.json())
      .then((data: { data: ActivityEvent[]; meta: FeedMeta }) => {
        setEvents(data.data)
        setMeta(data.meta)
      })
      .catch(() => setMeta({ page: 1, limit: 20, total: 0 }))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const isEmpty = meta?.total === 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mentors suivis</h1>

      {isEmpty ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3" aria-hidden="true">👥</p>
          <p className="font-medium mb-1">Vous ne suivez aucun mentor</p>
          <p className="text-muted-foreground text-sm mb-6">
            Suivez des mentors pour voir leur activité ici.
          </p>
          <a
            href="/search"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Découvrir des mentors
          </a>
        </div>
      ) : (
        <div className="space-y-3" role="feed" aria-label="Activité des mentors suivis">
          {events.map((event, i) => (
            <article key={i} className="flex items-start gap-3 p-4 border border-border rounded-xl">
              <span className="text-xl shrink-0" aria-hidden="true">
                {EVENT_ICONS[event.type] ?? '●'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{event.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <time dateTime={event.createdAt}>
                    {new Date(event.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
