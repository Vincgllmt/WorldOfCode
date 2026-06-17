'use client'

import { ReactNode, useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import PostItem from '@/components/post/PostItem'
import { useUserPosts } from '@/hooks/useUserProfile'

type UserPostListProps = {
  userId: number
  renderActions?: (postId: number) => ReactNode
}

export default function UserPostList({ userId, renderActions }: UserPostListProps) {
  const { posts, isLoading, error } = useUserPosts(userId)

  const orderedPosts = useMemo(
    () =>
      posts
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [posts],
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger les publications pour le moment.
      </p>
    )
  }

  if (orderedPosts.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun post pour l'instant.</p>
  }

  return (
    <div className="space-y-4">
      {orderedPosts.map((post) => (
        <div key={post.id}>
          <PostItem post={post} />
          {renderActions && (
            <div className="mt-1 flex justify-end px-1">
              {renderActions(post.id)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
