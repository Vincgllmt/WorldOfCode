'use client'

import Link from 'next/link'
import { ChevronRight, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import SuggestedUserCard from './SuggestedUserCard'
import { useSuggestedUsers } from '@/hooks/useSuggestions'
import { useAuth } from '@/hooks/useAuth'

function UserSkeletons() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function SuggestionsSidebar() {
  const { user } = useAuth()
  const { suggestedUsers, isLoading } = useSuggestedUsers(5)

  if (!user) return null

  const hasUsers = suggestedUsers.length > 0

  if (!isLoading && !hasUsers) return null

  return (
    <aside>
      <div className="rounded-2xl border border-border/60 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Profils suggérés</h3>
        </div>

        {isLoading ? (
          <UserSkeletons />
        ) : hasUsers ? (
          <div className="space-y-0.5">
            {suggestedUsers.map((u) => (
              <SuggestedUserCard key={u.id} user={u} currentUserId={user.id} />
            ))}
          </div>
        ) : (
          <p className="py-4 text-center text-xs text-muted-foreground">
            Aucune suggestion pour le moment
          </p>
        )}

        {hasUsers && (
          <Link
            href="/suggestions"
            className="mt-3 flex items-center justify-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Voir plus
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </aside>
  )
}
