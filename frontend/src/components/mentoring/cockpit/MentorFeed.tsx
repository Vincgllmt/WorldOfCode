'use client'

import { useState } from 'react'
import { useMentorFeed } from '@/hooks/useMentorFeed'
import MentoringRequestCard from '../feed/MentoringRequestCard'
import FeedFilters from '../feed/FeedFilters'
import type { MentoringRequest, MentorProfile } from '@/types/mentoring'

interface Props {
  mentorProfile: MentorProfile
  onSelectRequest: (r: MentoringRequest) => void
  selectedRequestId: number | null
  onPinnedChange?: (pinned: MentoringRequest[]) => void
  onSessionAccepted?: () => void
}

export default function MentorFeed({ onSelectRequest, selectedRequestId, onPinnedChange, onSessionAccepted }: Props) {
  const [techFilter, setTechFilter] = useState<string | undefined>(undefined)
  const { data, isLoading, error, refetch } = useMentorFeed(techFilter)

  const handleRefetch = async () => {
    await refetch()
    if (onPinnedChange) {
      onPinnedChange(data.filter(r => r.pin?.isActive))
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted/40 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-destructive flex items-center gap-2">
        <span aria-hidden="true">⚠️</span> {error}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur px-6 py-3 border-b border-border">
        <FeedFilters
          requests={data}
          selected={techFilter}
          onSelect={setTechFilter}
        />
      </div>
      <div className="p-6 space-y-4">
        {data.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Aucune demande disponible pour le moment.
          </p>
        )}
        {data.map(r => (
          <MentoringRequestCard
            key={r.id}
            request={r}
            isSelected={r.id === selectedRequestId}
            onClick={() => onSelectRequest(r)}
            onRefetch={handleRefetch}
            onSessionAccepted={onSessionAccepted}
          />
        ))}
      </div>
    </div>
  )
}
