'use client'

import { useState } from 'react'
import { Settings } from 'lucide-react'
import FollowToggleButton from '@/components/follow/FollowToggleButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import type { PublicUser } from '@/interfaces/user'
import { cn } from '@/lib/utils'
import UserSettingsModal from '@/components/profile/UserSettingsModal'

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
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <section
      className={cn(
        'relative flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      aria-label="Entête du profil utilisateur"
    >
      {isOwnProfile ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          aria-label="Ouvrir les réglages du profil"
          aria-haspopup="dialog"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="h-5 w-5" aria-hidden />
        </Button>
      ) : null}

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
        <div className="flex items-center gap-3">
          <FollowToggleButton
            currentUserId={viewerId}
            targetUserId={user.id}
            initialIsFollowing={isFollowedByViewer}
            variant="solid"
            size="md"
            className="w-full sm:w-auto"
          />
        </div>
      ) : null}

      {isOwnProfile ? (
        <UserSettingsModal
          userId={user.id}
          open={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
        />
      ) : null}
    </section>
  )
}
