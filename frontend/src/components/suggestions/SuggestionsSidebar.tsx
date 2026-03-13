'use client'

import { Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import SwipeDeck from './SwipeDeck'
import { useSwipeSuggestions } from '@/hooks/useSuggestions'
import { useAuth } from '@/hooks/useAuth'

function SwipeDeckSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full rounded-2xl border border-border/40 bg-muted/30 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="mt-2.5 h-3 w-full" />
        <Skeleton className="mt-1 h-3 w-3/4" />
        <div className="mt-2.5 flex gap-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
      </div>
      <div className="flex gap-5">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  )
}

export default function SuggestionsSidebar() {
  const { user } = useAuth()
  const { visibleCards, hasCards, isLoading, advance } = useSwipeSuggestions(5)

  if (!user) return null
  if (!isLoading && !hasCards) return null

  return (
    <aside>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Découvrir</h3>
        </div>

        {isLoading ? (
          <SwipeDeckSkeleton />
        ) : (
          <SwipeDeck
            cards={visibleCards}
            currentUserId={user.id}
            onSwipe={advance}
          />
        )}
      </div>
    </aside>
  )
}
