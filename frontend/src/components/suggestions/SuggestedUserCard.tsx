'use client'

import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import FollowToggleButton from '@/components/follow/FollowToggleButton'
import type { SuggestedUser } from '@/interfaces/suggestion'

interface SuggestedUserCardProps {
  user: SuggestedUser
  currentUserId: number
}

export default function SuggestedUserCard({ user, currentUserId }: SuggestedUserCardProps) {
  const displayName = [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-muted/50">
      <Link href={`/profile/${user.id}`} className="shrink-0">
        <Avatar className="h-10 w-10">
          {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={displayName} /> : null}
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <Link href={`/profile/${user.id}`} className="block">
          <p className="truncate text-sm font-medium leading-tight hover:underline">
            {displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        </Link>
        {user.location && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{user.location}</span>
          </p>
        )}
      </div>

      <FollowToggleButton
        currentUserId={currentUserId}
        targetUserId={user.id}
        initialIsFollowing={false}
        variant="solid"
        size="sm"
      />
    </div>
  )
}
