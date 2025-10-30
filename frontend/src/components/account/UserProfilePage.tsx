'use client'

import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserGroups } from '@/hooks/useUsers'
import { useFollowers } from '@/hooks/useFollow'
import { useUserProfile } from '@/hooks/useUserProfile'
import UserProfileHeader from '@/components/account/UserProfileHeader'
import UserFollowCounts from '@/components/account/UserFollowCounts'
import UserPostList from '@/components/post/UserPostList'
import UserGroupsPanel from '@/components/account/UserGroupsPanel'
import ConversationsPlaceholder from '@/components/account/ConversationsPlaceholder'
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
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-3 h-5 w-36" />
            <Skeleton className="mt-3 h-5 w-40" />
          </section>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-5 w-40" />
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-52 w-full rounded-2xl" />
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
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_260px]">
      <div className="space-y-6">
        <UserProfileHeader
          viewerId={viewerId}
          user={user}
          isFollowedByViewer={isFollowedByViewer}
        />

        {groupsLoading ? (
          <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-48" />
            <div className="mt-4 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-40" />
            </div>
          </section>
        ) : groupsError ? (
          <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Groupes rejoints</h2>
            <p className="mt-4 text-sm text-destructive">
              Impossible de récupérer les groupes pour le moment.
            </p>
          </section>
        ) : (
          <UserGroupsPanel groups={sortedGroups} />
        )}
      </div>

      <div className="space-y-6">
        <UserFollowCounts userId={userId} />

        <section
          aria-labelledby="profile-posts"
          className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm"
        >
          <h2 id="profile-posts" className="text-lg font-semibold">
            Publications
          </h2>
          <div className="mt-4 space-y-4">
            <UserPostList userId={userId} />
          </div>
        </section>
      </div>

      <ConversationsPlaceholder />
    </div>
  )
}
