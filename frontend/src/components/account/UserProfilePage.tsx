'use client'

import { useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserGroups } from '@/hooks/useUsers'
import { useFollowers } from '@/hooks/useFollow'
import { useUserProfile } from '@/hooks/useUserProfile'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import MentorPublicProfile from '@/components/mentoring/MentorPublicProfile'
import CvSocialToggle from '@/components/profile/CvSocialToggle'
import CvTimeline from '@/components/profile/CvTimeline'
import ExperienceDndList from '@/components/profile/ExperienceDndList'
import EngagementSummaryBadge from '@/components/profile/EngagementSummaryBadge'
import SocialActivityView from '@/components/profile/SocialActivityView'
import { useReorderExperiences } from '@/hooks/useReorderExperiences'
import { useUpdateFieldVisibility } from '@/hooks/useUpdateFieldVisibility'
import { VisibilityToggle } from '@/components/profile/VisibilityToggle'
import ShareCvDialog from '@/components/profile/ShareCvDialog'
import type { Visibility } from '@/interfaces/user'
import ProfileAboutSection from '@/components/profile/ProfileAboutSection'
import ProfileSkillsSection from '@/components/profile/ProfileSkillsSection'
import EditBioDialog from '@/components/profile/EditBioDialog'
import EditExperiencesDialog from '@/components/profile/EditExperiencesDialog'
import EditSkillsDialog from '@/components/profile/EditSkillsDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Briefcase, Share2, Download, Pencil, Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import type { Group } from '@/interfaces/group'
import type { MentorProfile } from '@/types/mentoring'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { useEffect } from 'react'

type UserProfilePageProps = {
  userId: number
}

const sortGroups = (groups: Group[] | undefined): Group[] =>
  [...(groups ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }))

export default function UserProfilePage({ userId }: UserProfilePageProps) {
  const { user: viewer, isLoading: authLoading } = useAuth()
  const viewerId = viewer?.id ?? 0

  const { user, isLoading: userLoading, error: userError } = useUserProfile(userId)
  const { data: groups, isLoading: groupsLoading, error: groupsError } = useUserGroups(userId)
  const { followers } = useFollowers(userId)

  const [mentorProfile, setMentorProfile] = useState<MentorProfile | null>(null)
  const [mentorLoading, setMentorLoading] = useState(true)
  const [activeMode, setActiveMode] = useState<'cv' | 'social'>('cv')
  const [isEditMode, setIsEditMode] = useState(false)
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [editBioOpen, setEditBioOpen] = useState(false)
  const [editExpOpen, setEditExpOpen] = useState(false)
  const [editSkillsOpen, setEditSkillsOpen] = useState(false)

  useEffect(() => {
    fetchWithAuth(`/users/${userId}/mentor-profile`)
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
  const { mutate: reorderExperiences } = useReorderExperiences(userId)
  const { mutate: updateFieldVisibility } = useUpdateFieldVisibility(userId)
  const sortedGroups = useMemo(() => sortGroups(groups), [groups])

  if (authLoading || userLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <div className="flex flex-col items-center">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="mt-3 h-6 w-36" />
              <Skeleton className="mt-1 h-4 w-28" />
              <Skeleton className="mt-3 h-4 w-48" />
              <Skeleton className="mt-4 h-9 w-full" />
            </div>
          </div>
        </div>
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

      {/* Main content */}
      <main className="space-y-6">
        {/* Toolbar row */}
        <div className="sticky top-[var(--navbar-height)] z-10 -mt-8 bg-background pt-8 pb-2">
          <div className="flex items-center justify-between gap-3">
            <CvSocialToggle activeMode={activeMode} onToggle={setActiveMode} />
            {isOwnProfile && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareDialogOpen(true)}
                  className="gap-1.5"
                >
                  <Share2 className="h-4 w-4" />
                  Partager
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => console.log('Exporter PDF')}
                  className="gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  Exporter PDF
                </Button>
                <Button
                  variant={isEditMode ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIsEditMode((v) => !v)}
                  className="gap-1.5"
                >
                  {isEditMode ? (
                    <>
                      <Check className="h-4 w-4" />
                      Terminé
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" />
                      Mode édition
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>

        {activeMode === 'cv' ? (
          <>
            <EngagementSummaryBadge userId={userId} />

            <ProfileAboutSection
              bio={user.bio}
              isOwnProfile={isOwnProfile}
              onEdit={() => setEditBioOpen(true)}
              visibilityToggle={isEditMode && isOwnProfile ? (
                <VisibilityToggle
                  visibility={(user.fieldVisibility?.bio as Visibility) ?? 'PUBLIC'}
                  onChange={(v) => updateFieldVisibility({ bio: v })}
                />
              ) : undefined}
            />

            <Card className="border-border/70 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  Expériences
                  {isEditMode && (
                    <span className="ml-auto text-xs font-normal text-muted-foreground">
                      Glissez pour réordonner
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditMode ? (
                  <ExperienceDndList
                    experiences={user.experiences ?? []}
                    userId={userId}
                    onReorder={(orderedIds) => reorderExperiences(orderedIds)}
                  />
                ) : (
                  <CvTimeline experiences={user.experiences ?? []} />
                )}
              </CardContent>
            </Card>

            <ProfileSkillsSection
              skills={user.skills}
              isOwnProfile={isOwnProfile}
              onEdit={() => setEditSkillsOpen(true)}
              visibilityToggle={isEditMode && isOwnProfile ? (
                <VisibilityToggle
                  visibility={(user.fieldVisibility?.skills as Visibility) ?? 'PUBLIC'}
                  onChange={(v) => updateFieldVisibility({ skills: v })}
                />
              ) : undefined}
            />
          </>
        ) : (
          <SocialActivityView userId={userId} isOwnProfile={isOwnProfile} />
        )}

        {!mentorLoading && mentorProfile && !isOwnProfile && (
          <MentorPublicProfile
            profile={mentorProfile}
            userId={userId}
            viewerId={viewerId}
            isFollowing={isFollowedByViewer}
          />
        )}
      </main>

      {isOwnProfile && (
        <>
          <ShareCvDialog
            open={shareDialogOpen}
            onOpenChange={setShareDialogOpen}
            userId={userId}
            currentToken={user.cvPublicToken}
          />
          <EditBioDialog open={editBioOpen} onOpenChange={setEditBioOpen} user={user} />
          <EditExperiencesDialog open={editExpOpen} onOpenChange={setEditExpOpen} user={user} />
          <EditSkillsDialog open={editSkillsOpen} onOpenChange={setEditSkillsOpen} user={user} />
        </>
      )}
    </div>
  )
}
