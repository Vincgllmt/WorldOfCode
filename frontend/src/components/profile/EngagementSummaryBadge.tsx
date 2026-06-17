'use client'

import { useEngagementSummary } from '@/hooks/useEngagementSummary'
import { Skeleton } from '@/components/ui/skeleton'

type EngagementSummaryBadgeProps = {
  userId: number
}

export default function EngagementSummaryBadge({ userId }: EngagementSummaryBadgeProps) {
  const { data, isLoading } = useEngagementSummary(userId)

  if (isLoading) {
    return <Skeleton className="h-6 w-72 rounded-full" />
  }

  if (!data) return null

  const label = data.mentorRating !== null
    ? `Membre actif · ${data.contributionCount} contributions · Mentor noté ${data.mentorRating}/5`
    : `Membre actif · ${data.contributionCount} contributions`

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {label}
    </span>
  )
}
