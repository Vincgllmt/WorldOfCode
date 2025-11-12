'use client'

import type { Post } from '@/interfaces/post'
import PostItem from './PostItem'

export default function PostItemByGroup({ post }: { post: Post }) {
  return <PostItem post={post} defaultShowComments />
}
