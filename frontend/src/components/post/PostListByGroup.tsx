'use client'

import { usePostsByGroup } from '@/hooks/usePosts'
import PostList from './PostList'

type Props = {
  groupId: number
}

export default function PostListByGroup({ groupId }: Props) {
  const { data, isLoading, isError } = usePostsByGroup(groupId)

  return (
    <PostList
      posts={data}
      isLoading={isLoading}
      isError={isError}
      emptyMessage="Aucun post pour ce groupe."
      defaultShowComments
    />
  )
}
