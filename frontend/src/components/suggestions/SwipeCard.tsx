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
    <div className="flex h-full w-full flex-col rounded-xl border border-border/60 bg-card px-4 py-4 shadow-md">
      {/* Header : avatar + infos */}
      <div className="flex items-center gap-3">
        <Link href={`/user/${user.id}`} className="shrink-0">
          <Avatar className="h-10 w-10">
            {user.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="min-w-0 flex-1">
          <Link href={`/user/${user.id}`}>
            <p className="truncate text-sm font-semibold leading-tight hover:underline">
              {displayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
          </Link>
          {user.location && (
            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{user.location}</span>
            </p>
          )}
        </div>
      </div>

      {/* Bio */}
      {user.bio && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {user.bio}
        </p>
      )}

      {/* Skills en commun : nombre + tags */}
      {user.sharedSkills.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-primary">
            <Code2 className="h-3.5 w-3.5" />
            {user.sharedSkills.length} compétence{user.sharedSkills.length > 1 ? 's' : ''} en commun
          </p>
          <div className="flex flex-wrap gap-1">
            {user.sharedSkills.slice(0, 4).map((skill) => (
              <Badge
                key={skill}
                variant="secondary"
                className="text-[10px] px-2 py-0 h-5 font-medium"
              >
                {skill}
              </Badge>
            ))}
            {user.sharedSkills.length > 4 && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 h-5 font-medium text-muted-foreground"
              >
                +{user.sharedSkills.length - 4}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Groupes en commun : nombre + tags */}
      {user.sharedGroups.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1 flex items-center gap-1 text-[11px] font-medium text-blue-500">
            <Users className="h-3.5 w-3.5" />
            {user.sharedGroups.length} groupe{user.sharedGroups.length > 1 ? 's' : ''} en commun
          </p>
          <div className="flex flex-wrap gap-1">
            {user.sharedGroups.slice(0, 3).map((group) => (
              <Badge
                key={group}
                variant="outline"
                className="text-[10px] px-2 py-0 h-5 font-medium"
              >
                {group}
              </Badge>
            ))}
            {user.sharedGroups.length > 3 && (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0 h-5 font-medium text-muted-foreground"
              >
                +{user.sharedGroups.length - 3}
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Followers mutuels */}
      {user.mutualFollowsCount > 0 && (
        <div className="mt-auto pt-2.5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            {user.mutualFollowsCount} abonné{user.mutualFollowsCount > 1 ? 's' : ''} en commun
          </span>
        </div>
      )}
    </div>
  )
}
