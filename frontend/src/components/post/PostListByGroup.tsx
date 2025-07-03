'use client'

import { usePostsByGroup } from '@/hooks/usePosts'
import PostItemByGroup from './PostItemByGroup'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  groupId: number
}

export default function PostListByGroup({ groupId }: Props) {
  const { data: posts, isLoading, isError } = usePostsByGroup(groupId)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[150px] w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (isError) {
    return <p className="text-red-500">Erreur lors du chargement des posts.</p>
  }

  if (!posts || posts.length === 0) {
    return <p className="text-muted-foreground">Aucun post pour ce groupe.</p>
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostItemByGroup key={post.id} post={post} />
      ))}
    </div>
  )
}
