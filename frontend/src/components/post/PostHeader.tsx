'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'
import FollowToggleButton from '@/components/follow/FollowToggleButton'

type PostHeaderProps = {
  currentUserId: number
  authorId: number
  authorUsername: string
  authorAvatarUrl?: string | null
  isAuthorFollowedByMe?: boolean
  className?: string
}

function getInitials(username: string): string {
  const trimmed = username.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}

export default function PostHeader({
  currentUserId,
  authorId,
  authorUsername,
  authorAvatarUrl,
  isAuthorFollowedByMe,
  className,
}: PostHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 overflow-hidden rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          {authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={authorAvatarUrl}
              alt={`Avatar de ${authorUsername}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-primary select-none">
              {getInitials(authorUsername)}
            </span>
          )}
        </div>
        <Link href={`/user/${authorId}`} className="text-sm font-medium hover:underline hover:text-primary transition">
          {authorUsername}
        </Link>
      </div>

      {currentUserId !== authorId ? (
        <FollowToggleButton
          currentUserId={currentUserId}
          targetUserId={authorId}
          initialIsFollowing={isAuthorFollowedByMe}
          size="sm"
        />
      ) : null}
    </div>
  )
}
