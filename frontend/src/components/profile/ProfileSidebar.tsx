'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings, MapPin, Pencil } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import FollowToggleButton from '@/components/follow/FollowToggleButton'
import UserSettingsModal from '@/components/profile/UserSettingsModal'
import UserFollowCounts from '@/components/account/UserFollowCounts'
import AvailabilityBadge from '@/components/profile/AvailabilityBadge'
import ProfileLinksSection from '@/components/profile/ProfileLinksSection'
import EditLinksDialog from '@/components/profile/EditLinksDialog'
import type { PublicUser } from '@/interfaces/user'
import type { Group } from '@/interfaces/group'

type ProfileSidebarProps = {
  user: PublicUser
  viewerId: number
  isOwnProfile: boolean
  isFollowedByViewer: boolean
  groups: Group[]
  groupsLoading: boolean
  groupsError: Error | null
}

const getInitials = (username: string): string => {
  if (!username) return ''
  const parts = username.trim().split(/\s+/u)
  if (parts.length === 1) return parts[0]?.slice(0, 2)?.toUpperCase() ?? ''
  const [first, second] = parts
  return `${first?.[0] ?? ''}${second?.[0] ?? ''}`.toUpperCase()
}

export default function ProfileSidebar({
  user,
  viewerId,
  isOwnProfile,
  isFollowedByViewer,
  groups,
  groupsLoading,
  groupsError,
}: ProfileSidebarProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [editLinksOpen, setEditLinksOpen] = useState(false)

  const hasLocation = Boolean(user.location)
  const hasAvailability = Boolean(user.availability)
  const hasBio = Boolean(user.bio)

  return (
    <div className="space-y-4">
      {/* Identity card */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="h-20 w-20 border-2 border-border">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={`Avatar de ${user.username}`} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
              {getInitials(user.username)}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-3 text-xl font-bold leading-tight text-foreground">
            {user.username}
          </h1>

          {(user.firstname || user.lastname) && (
            <p className="text-sm text-muted-foreground">
              {[user.firstname, user.lastname].filter(Boolean).join(' ')}
            </p>
          )}

          {/* Location + Availability */}
          {(hasLocation || hasAvailability) && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {hasLocation && (
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {user.location}
                </span>
              )}
              {hasAvailability && (
                <AvailabilityBadge availability={user.availability!} />
              )}
            </div>
          )}

          {/* Bio short */}
          {hasBio && (
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-3">
              {user.bio}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-4">
          {isOwnProfile ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2"
              onClick={() => setIsSettingsOpen(true)}
            >
              <Settings className="h-4 w-4" />
              Modifier le profil
            </Button>
          ) : (
            <FollowToggleButton
              currentUserId={viewerId}
              targetUserId={user.id}
              initialIsFollowing={isFollowedByViewer}
              variant="solid"
              size="md"
              className="w-full"
            />
          )}
        </div>

        {/* Stats */}
        <div className="mt-4 border-t border-border/60 pt-4">
          <UserFollowCounts userId={user.id} />
        </div>
      </div>

      {/* Links */}
      {(isOwnProfile || (user.links && user.links.length > 0)) && (
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Liens</h2>
            {isOwnProfile && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setEditLinksOpen(true)}
                aria-label="Modifier les liens"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          {user.links && user.links.length > 0 ? (
            <ProfileLinksSection links={user.links} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun lien renseigné.
            </p>
          )}
        </div>
      )}

      {/* Groups */}
      <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Groupes rejoints</h2>
        {groupsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-40" />
          </div>
        ) : groupsError ? (
          <p className="text-sm text-destructive">
            Impossible de récupérer les groupes.
          </p>
        ) : groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {groups.map((group) => (
              <Link key={group.id} href={`/group/${group.id}`} className="no-underline">
                <Badge
                  variant="secondary"
                  className="text-xs transition-colors hover:bg-secondary/80"
                >
                  {group.name}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun groupe rejoint.
          </p>
        )}
      </div>

      {/* Settings modal */}
      {isOwnProfile && (
        <>
          <UserSettingsModal
            userId={user.id}
            open={isSettingsOpen}
            onOpenChange={setIsSettingsOpen}
          />
          <EditLinksDialog
            open={editLinksOpen}
            onOpenChange={setEditLinksOpen}
            user={user}
          />
        </>
      )}
    </div>
  )
}
