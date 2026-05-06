'use client'

import { useState, useEffect, useRef } from 'react'
import { Target, Globe } from 'lucide-react'
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
  initialRequestId?: number | null
}

export default function MentorFeed({ mentorProfile, onSelectRequest, selectedRequestId, onPinnedChange, onSessionAccepted, initialRequestId }: Props) {
  const [techFilter, setTechFilter] = useState<string | undefined>(undefined)
  const { data, isLoading, error, refetch } = useMentorFeed(techFilter)
  const hasAutoSelected = useRef(false)

  useEffect(() => {
    if (onPinnedChange) {
      onPinnedChange(data.filter(r => r.pin?.isActive))
    }
  }, [data, onPinnedChange])

  useEffect(() => {
    if (!initialRequestId || isLoading || data.length === 0 || hasAutoSelected.current) return
    const found = data.find(r => r.id === initialRequestId)
    if (found) {
      hasAutoSelected.current = true
      onSelectRequest(found)
    }
  }, [data, isLoading, initialRequestId])

  const handleRefetch = async () => {
    await refetch()
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
        {(() => {
          const targeted = data.filter(r => r.isTargeted)
          const publicReqs = data.filter(r => !r.isTargeted)
          return (
            <>
              {targeted.length > 0 && (
                <>
                  <div className="flex items-center gap-2 text-xs font-semibold text-violet-400 uppercase tracking-wide">
                    <Target className="h-3.5 w-3.5" />
                    Demandes ciblées ({targeted.length})
                  </div>
                  {targeted.map(r => (
                    <MentoringRequestCard
                      key={r.id}
                      request={r}
                      isSelected={r.id === selectedRequestId}
                      onClick={() => onSelectRequest(r)}
                      onRefetch={handleRefetch}
                      onSessionAccepted={onSessionAccepted}
                      mentorSpecialties={mentorProfile.specialties}
                    />
                  ))}
                  {publicReqs.length > 0 && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2">
                      <Globe className="h-3.5 w-3.5" />
                      Demandes publiques ({publicReqs.length})
                    </div>
                  )}
                </>
              )}
              {publicReqs.map(r => (
                <MentoringRequestCard
                  key={r.id}
                  request={r}
                  isSelected={r.id === selectedRequestId}
                  onClick={() => onSelectRequest(r)}
                  onRefetch={handleRefetch}
                  onSessionAccepted={onSessionAccepted}
                  mentorSpecialties={mentorProfile.specialties}
                />
              ))}
            </>
          )
        })()}
      </div>
    </div>
  )
}
