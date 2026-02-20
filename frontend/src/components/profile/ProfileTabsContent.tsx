'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import UserPostList from '@/components/post/UserPostList'
import PostForm from '@/components/post/postForm'
import ProfileAboutSection from '@/components/profile/ProfileAboutSection'
import ProfileExperienceSection from '@/components/profile/ProfileExperienceSection'
import ProfileSkillsSection from '@/components/profile/ProfileSkillsSection'
import EditBioDialog from '@/components/profile/EditBioDialog'
import EditExperiencesDialog from '@/components/profile/EditExperiencesDialog'
import EditSkillsDialog from '@/components/profile/EditSkillsDialog'
import type { PublicUser } from '@/interfaces/user'

type ProfileTabsContentProps = {
  userId: number
  user: PublicUser
  isOwnProfile: boolean
}

export default function ProfileTabsContent({
  userId,
  user,
  isOwnProfile,
}: ProfileTabsContentProps) {
  const [activeTab, setActiveTab] = useState('publications')
  const [editBioOpen, setEditBioOpen] = useState(false)
  const [editExpOpen, setEditExpOpen] = useState(false)
  const [editSkillsOpen, setEditSkillsOpen] = useState(false)

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="sticky top-[var(--navbar-height)] z-10 -mt-8 bg-background pt-8 pb-2">
          <TabsList className="w-full">
            <TabsTrigger value="publications" className="flex-1">
              Publications
            </TabsTrigger>
            <TabsTrigger value="profil" className="flex-1">
              Profil
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="publications">
          <div className="space-y-6">
            {isOwnProfile && (
              <PostForm className="rounded-2xl border border-border/70 bg-card shadow-sm" />
            )}
            <UserPostList userId={userId} />
          </div>
        </TabsContent>

        <TabsContent value="profil">
          <div className="space-y-6">
            <ProfileAboutSection
              bio={user.bio}
              isOwnProfile={isOwnProfile}
              onEdit={() => setEditBioOpen(true)}
            />
            <ProfileExperienceSection
              experiences={user.experiences}
              isOwnProfile={isOwnProfile}
              onEdit={() => setEditExpOpen(true)}
            />
            <ProfileSkillsSection
              skills={user.skills}
              isOwnProfile={isOwnProfile}
              onEdit={() => setEditSkillsOpen(true)}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit dialogs (rendered outside Tabs to avoid unmount issues) */}
      {isOwnProfile && (
        <>
          <EditBioDialog open={editBioOpen} onOpenChange={setEditBioOpen} user={user} />
          <EditExperiencesDialog open={editExpOpen} onOpenChange={setEditExpOpen} user={user} />
          <EditSkillsDialog open={editSkillsOpen} onOpenChange={setEditSkillsOpen} user={user} />
        </>
      )}
    </>
  )
}
