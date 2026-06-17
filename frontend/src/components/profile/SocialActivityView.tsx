'use client'

import UserPostList from '@/components/post/UserPostList'
import PostForm from '@/components/post/postForm'
import HighlightCard from './HighlightCard'
import PinPostButton from './PinPostButton'
import { useHighlights, useUnpinPost } from '@/hooks/useProfileHighlights'
import { Skeleton } from '@/components/ui/skeleton'
import { Pin } from 'lucide-react'

type SocialActivityViewProps = {
  userId: number
  isOwnProfile: boolean
}

export default function SocialActivityView({ userId, isOwnProfile }: SocialActivityViewProps) {
  const { data: highlights, isLoading: highlightsLoading } = useHighlights(userId)
  const { mutate: unpin } = useUnpinPost(userId)

  const pinnedPostIds = new Set((highlights ?? []).map((h) => h.postId))
  const isMaxReached = (highlights?.length ?? 0) >= 3

  return (
    <div className="space-y-6">
      {/* Temps forts */}
      {(isOwnProfile || (highlights && highlights.length > 0)) && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <Pin className="h-3.5 w-3.5" />
            Temps forts
          </h2>

          {highlightsLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : highlights && highlights.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {highlights.map((h) => (
                <HighlightCard
                  key={h.id}
                  highlight={h}
                  isOwnProfile={isOwnProfile}
                  onUnpin={() => unpin(h.postId)}
                />
              ))}
            </div>
          ) : isOwnProfile ? (
            <p className="rounded-xl border border-dashed border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
              Épinglez jusqu'à 3 posts pour les mettre en avant sur votre profil.
            </p>
          ) : null}
        </section>
      )}

      {/* PostForm pour le propriétaire */}
      {isOwnProfile && (
        <PostForm className="rounded-2xl border border-border/70 bg-card shadow-sm" />
      )}

      {/* Feed chronologique avec boutons épingler */}
      <UserPostList
        userId={userId}
        renderActions={(postId) => (
          <PinPostButton
            postId={postId}
            userId={userId}
            isPinned={pinnedPostIds.has(postId)}
            isOwnProfile={isOwnProfile}
            isMaxReached={isMaxReached}
          />
        )}
      />
    </div>
  )
}
