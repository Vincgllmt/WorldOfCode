'use client'

import { useMemo } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import PostItem from '@/components/post/PostItem'
import { useUserPosts } from '@/hooks/useUserProfile'

type UserPostListProps = {
  userId: number
}

export default function UserPostList({ userId }: UserPostListProps) {
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
    return <p className="text-sm text-muted-foreground">Aucun post pour l’instant.</p>
  }

  return (
    <div className="space-y-4">
      {orderedPosts.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  )
}
