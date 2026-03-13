'use client'

import Link from 'next/link'
import { MapPin, Code2, Users, UserCheck } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { SuggestedUser } from '@/interfaces/suggestion'

interface SwipeCardProps {
  user: SuggestedUser
}

export default function SwipeCard({ user }: SwipeCardProps) {
  const displayName =
    [user.firstname, user.lastname].filter(Boolean).join(' ') || user.username
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-full w-full flex-col rounded-xl border border-border/60 bg-card px-3 py-3 shadow-md">
      {/* Header : avatar + infos */}
      <div className="flex items-center gap-2.5">
        <Link href={`/profile/${user.id}`} className="shrink-0">
          <Avatar className="h-9 w-9">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/profile/${user.id}`}>
            <p className="truncate text-[13px] font-semibold leading-tight hover:underline">
              {displayName}
            </p>
            <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
          </Link>
          {user.location && (
            <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <MapPin className="h-2.5 w-2.5 shrink-0" />
              <span className="truncate">{user.location}</span>
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted-foreground leading-relaxed">
          {user.bio}
        </p>
      )}

      {/* Skills en commun : nombre + tags */}
      {user.sharedSkills.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-medium text-primary">
            <Code2 className="h-3 w-3" />
            {user.sharedSkills.length} comp&eacute;tence{user.sharedSkills.length > 1 ? 's' : ''} en commun
          </p>
          <div className="flex flex-wrap gap-1">
            {user.sharedSkills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="text-[9px] px-1.5 py-0 h-[18px] font-medium"
              >
                {skill}
              </Badge>
            ))}
            {user.sharedSkills.length > 4 && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-[18px] font-medium text-muted-foreground"
              >
                +{user.sharedSkills.length - 4}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Groupes + followers mutuels */}
      {(user.sharedGroups.length > 0 || user.mutualFollowsCount > 0) && (
        <div className="mt-auto flex flex-wrap gap-x-3 gap-y-0.5 pt-2 text-[10px] text-muted-foreground">
          {user.sharedGroups.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-2.5 w-2.5" />
              {user.sharedGroups.length} groupe{user.sharedGroups.length > 1 ? 's' : ''}
            </span>
          )}
          {user.mutualFollowsCount > 0 && (
            <span className="flex items-center gap-1">
              <UserCheck className="h-2.5 w-2.5" />
              {user.mutualFollowsCount} abonn&eacute;{user.mutualFollowsCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
