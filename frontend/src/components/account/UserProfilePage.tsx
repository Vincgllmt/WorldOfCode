'use client'

import { useMemo, useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserGroups } from '@/hooks/useUsers'
import { useFollowers } from '@/hooks/useFollow'
import { useUserProfile } from '@/hooks/useUserProfile'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import ProfileTabsContent from '@/components/profile/ProfileTabsContent'
import MentorPublicProfile from '@/components/mentoring/MentorPublicProfile'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { Skeleton } from '@/components/ui/skeleton'
import type { Group } from '@/interfaces/group'
import type { MentorProfile } from '@/types/mentoring'

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

  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null)
  const [mentorLoading, setMentorLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth(`/api/users/${userId}/mentor-profile`)
      .then(r => r.ok ? r.json() : null)
      .then(data => setMentorProfile(data))
      .catch(() => setMentorProfile(null))
      .finally(() => setMentorLoading(false))
  }, [userId])

  const isFollowedByViewer = useMemo(
    () => followers?.some((follower) => follower.id === viewerId) ?? false,
    [followers, viewerId],
  )

  const isOwnProfile = viewerId === user?.id

  const sortedGroups = useMemo(() => sortGroups(groups), [groups])

  // Loading skeleton (two-column layout)
  if (authLoading || userLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar skeleton */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex flex-col items-center">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="mt-3 h-6 w-36" />
              <Skeleton className="mt-1 h-4 w-28" />
              <Skeleton className="mt-3 h-4 w-48" />
              <Skeleton className="mt-4 h-9 w-full" />
            </div>
            <div className="mt-4 border-t border-border/60 pt-4">
              <Skeleton className="h-5 w-64" />
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <Skeleton className="h-4 w-24 mb-3" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-24" />
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="mt-6 space-y-4">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-[calc(var(--navbar-height)+2rem)] lg:max-h-[calc(100vh-var(--navbar-height)-2rem)] lg:overflow-y-auto lg:self-start">
        <ProfileSidebar
          user={user}
          viewerId={viewerId}
          isOwnProfile={isOwnProfile}
          isFollowedByViewer={isFollowedByViewer}
          groups={sortedGroups}
          groupsLoading={groupsLoading}
          groupsError={groupsError as Error | null}
        />
      </aside>

      {/* Main content with tabs */}
      <main>
        <ProfileTabsContent
          userId={userId}
          user={user}
          isOwnProfile={isOwnProfile}
        />
        {!mentorLoading && mentorProfile && !isOwnProfile && (
          <MentorPublicProfile
            profile={mentorProfile}
            userId={userId}
            viewerId={viewerId}
            isFollowing={isFollowedByViewer}
          />
        )}
      </main>
    </div>
  )
}
