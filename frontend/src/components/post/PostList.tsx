
'use client'
import { usePosts } from '@/hooks/usePosts'
import PostItem from './PostItem'

export default function PostList() {
  const { posts, isLoading } = usePosts()

  if (isLoading) return <p>Chargement...</p>

  return (
    <div className="space-y-4">
      {posts?.map((post) => (
        <PostItem key={post.id} post={post} />
      ))}
    </div>
  )
}
