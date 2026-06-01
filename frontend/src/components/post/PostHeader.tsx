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
  createdAt?: string
  className?: string
}

function getInitials(username: string): string {
  const trimmed = username.trim()
  if (!trimmed) return '?'
  return trimmed.slice(0, 2).toUpperCase()
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'à l\u2019instant'
  if (diffMin < 60) return `il y a ${diffMin} min`
  if (diffHour < 24) return `il y a ${diffHour} h`
  if (diffDay < 7) return `il y a ${diffDay} j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: diffDay > 365 ? 'numeric' : undefined })
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PostHeader({
  currentUserId,
  authorId,
  authorUsername,
  authorAvatarUrl,
  isAuthorFollowedByMe,
  createdAt,
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
        <div className="flex flex-col">
          <Link href={`/user/${authorId}`} className="text-sm font-medium leading-tight hover:underline hover:text-primary transition">
            {authorUsername}
          </Link>
          {createdAt && (
            <time
              dateTime={createdAt}
              title={formatFullDate(createdAt)}
              className="text-xs text-muted-foreground leading-tight"
            >
              {formatRelativeDate(createdAt)}
            </time>
          )}
        </div>
      </div>

      {currentUserId !== authorId ? (
        <div className="mr-8">
          <FollowToggleButton
            currentUserId={currentUserId}
            targetUserId={authorId}
            initialIsFollowing={isAuthorFollowedByMe}
            size="sm"
          />
        </div>
      ) : null}
    </div>
  )
}
