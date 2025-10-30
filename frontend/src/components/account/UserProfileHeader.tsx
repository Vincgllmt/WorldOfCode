'use client'

import FollowToggleButton from '@/components/follow/FollowToggleButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { PublicUser } from '@/interfaces/user'
import { cn } from '@/lib/utils'

type UserProfileHeaderProps = {
  viewerId: number
  user: PublicUser
  isFollowedByViewer?: boolean
  className?: string
}

const getInitials = (username: string): string => {
  if (!username) return ''
  const parts = username.trim().split(/\s+/u)
  if (parts.length === 1) {
    return parts[0]?.slice(0, 2)?.toUpperCase() ?? ''
  }
  const [first, second] = parts
  return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase()
}

export default function UserProfileHeader({
  viewerId,
  user,
  isFollowedByViewer,
  className,
}: UserProfileHeaderProps) {
  const isOwnProfile = viewerId === user.id

  return (
    <section
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      aria-label="Entête du profil utilisateur"
    >
      <div className="flex flex-1 items-center gap-4">
        <Avatar className="h-16 w-16 border border-border">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={`Avatar de ${user.username}`} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
            {getInitials(user.username)}
          </AvatarFallback>
        </Avatar>

        <div className="space-y-1">
          <p className="text-2xl font-semibold leading-none tracking-tight">
            {user.username}
          </p>
          {isOwnProfile && user.email ? (
            <p className="text-sm text-muted-foreground">{user.email}</p>
          ) : null}
        </div>
      </div>

      {!isOwnProfile ? (
        <FollowToggleButton
          currentUserId={viewerId}
          targetUserId={user.id}
          initialIsFollowing={isFollowedByViewer}
          variant="solid"
          size="md"
          className="w-full sm:w-auto"
        />
      ) : null}
    </section>
  )
}
