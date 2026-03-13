'use client'

import { Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import SuggestedUserCard from '@/components/suggestions/SuggestedUserCard'
import { useSuggestedUsers } from '@/hooks/useSuggestions'
import { useAuth } from '@/hooks/useAuth'

function UserSkeletons({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2.5">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      ))}
    </div>
  )
}

export default function SuggestionsPage() {
  const { user } = useAuth()
  const { suggestedUsers, isLoading } = useSuggestedUsers(20)

  if (!user) return null

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <section>
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Profils suggérés pour vous</h2>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4">
          {isLoading ? (
            <UserSkeletons />
          ) : suggestedUsers.length > 0 ? (
            <div className="space-y-0.5">
              {suggestedUsers.map((u) => (
                <SuggestedUserCard key={u.id} user={u} currentUserId={user.id} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Aucune suggestion pour le moment. Complétez votre profil pour obtenir des recommandations personnalisées.
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
