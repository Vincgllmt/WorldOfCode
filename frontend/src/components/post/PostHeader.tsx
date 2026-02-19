'use client'

import Image from 'next/image'
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
        <div className="h-9 w-9 overflow-hidden rounded-full bg-muted">
          {authorAvatarUrl ? (
            <Image
              src={authorAvatarUrl}
              alt={`Avatar de ${authorUsername}`}
              width={36}
              height={36}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full" aria-hidden />
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
