'use client'


import PostForm from '@/components/post/postForm'
import PostList from '@/components/post/PostList'

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <PostForm />
      <PostList />
    </div>
  )
}
