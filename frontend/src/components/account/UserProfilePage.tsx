'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useUserGroups } from '@/hooks/useUsers'
import { useFollowers } from '@/hooks/useFollow'
import { useUserProfile } from '@/hooks/useUserProfile'
import UserProfileHeader from '@/components/account/UserProfileHeader'
import UserFollowCounts from '@/components/account/UserFollowCounts'
import UserPostList from '@/components/post/UserPostList'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Group } from '@/interfaces/group'

type UserProfilePageProps = {
  userId: number
}

const sortGroups = (groups: Group[] | undefined): Group[] =>
  [...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))

export default function UserProfilePage({ userId }: UserProfilePageProps) {
  const { user: viewer, isLoading: authLoading } = useAuth()
  const viewerId = viewer?.id ?? 0

  const { user, isLoading: userLoading, error: userError } = useUserProfile(userId)
  const {
    data: groups,
    isLoading: groupsLoading,
    error: groupsError,
  } = useUserGroups(userId)
  const { followers } = useFollowers(userId)

  const isFollowedByViewer = useMemo(
    () => followers?.some((follower) => follower.id === viewerId) ?? false,
    [followers, viewerId],
  )

  const sortedGroups = useMemo(() => sortGroups(groups), [groups])

  if (authLoading || userLoading) {
    return (
      <div className="space-y-8">
        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </section>
        <Skeleton className="h-5 w-64" />
        <section className="space-y-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-20 w-full" />
        </section>
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (userError || !user) {
    return (
      <p className="text-sm text-destructive">
        Impossible de charger le profil pour le moment.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      <UserProfileHeader
        viewerId={viewerId}
        user={user}
        isFollowedByViewer={isFollowedByViewer}
      />

      <UserFollowCounts userId={userId} />

      <section aria-labelledby="profile-groups">
        <h2 id="profile-groups" className="text-lg font-semibold">
          Groupes rejoints
        </h2>
        {groupsLoading ? (
          <div className="mt-3 rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-48" />
            <div className="mt-3 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>
        ) : groupsError ? (
          <p className="mt-2 text-sm text-destructive">
            Impossible de récupérer les groupes pour le moment.
          </p>
        ) : sortedGroups.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {sortedGroups.map((group) => (
              <Link key={group.id} href={`/group/${group.id}`} className="no-underline">
                <Badge
                  variant="secondary"
                  className="inline-flex items-center px-3 py-1 text-sm transition-colors hover:bg-secondary/80"
                >
                  {group.name}
                </Badge>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun groupe rejoint pour le moment.
          </p>
        )}
      </section>

      <section aria-labelledby="profile-posts" className="space-y-4">
        <h2 id="profile-posts" className="text-lg font-semibold">
          Publications
        </h2>
        <UserPostList userId={userId} />
      </section>
    </div>
  )
}
