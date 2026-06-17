'use client'

import UserPostList from '@/components/post/UserPostList'
import PostForm from '@/components/post/postForm'

type SocialActivityViewProps = {
  userId: number
  isOwnProfile: boolean
}

export default function SocialActivityView({ userId, isOwnProfile }: SocialActivityViewProps) {
  return (
    <div className="space-y-6">
      {/* Temps forts — complété en story 17.3 */}
      {isOwnProfile && (
        <PostForm className="rounded-2xl border border-border/70 bg-card shadow-sm" />
      )}
      <UserPostList userId={userId} />
    </div>
  )
}
