'use client'

import { useMemo } from 'react'
import { usePosts } from '@/hooks/usePosts'
import PostItem from './PostItem'
import type { Post } from '@/interfaces/post'

type PostListProps = {
  posts?: Post[] | null
  isLoading?: boolean
  isError?: boolean
  emptyMessage?: string
  defaultShowComments?: boolean
}

export default function PostList({
  posts,
  isLoading,
  isError,
  emptyMessage = 'Aucun post pour le moment.',
  defaultShowComments,
}: PostListProps) {
  const shouldUseQuery = typeof posts === 'undefined'
  const { posts: queriedPosts, isLoading: queryLoading, error: queryError } = usePosts()

  const loading = typeof isLoading !== 'undefined' ? isLoading : queryLoading
  const errorState = typeof isError !== 'undefined' ? isError : Boolean(queryError)
  const sourcePosts = shouldUseQuery ? queriedPosts : posts
  const orderedPosts = useMemo(() => {
    return sourcePosts
      ?.slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [sourcePosts])

  if (loading) {
    return <p>Chargement...</p>
  }

  if (errorState) {
    return <p className="text-red-500">Erreur lors du chargement des posts.</p>
  }

  if (!orderedPosts || orderedPosts.length === 0) {
    return <p className="text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="space-y-4">
      {orderedPosts.map((post) => (
        <PostItem key={post.id} post={post} defaultShowComments={defaultShowComments} />
      ))}
    </div>
  )
}
