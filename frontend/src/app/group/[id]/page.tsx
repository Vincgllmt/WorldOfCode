'use client'

import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useGroup } from '@/hooks/useGroups'
import { useUserGroups } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import GroupJoinToggle from '@/components/group/GroupJoinToggle'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import PostFormByGroup from '@/components/post/PostFormByGroup'
import PostListByGroup from '@/components/post/PostListByGroup'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import TechWatchList from '@/components/techwatch/TechWatchList'

export default function GroupPage() {
    const { id } = useParams()
    const groupId = Number(id)
    const [activeTab, setActiveTab] = useState('publications')

    const { user } = useAuth()
    const { data: group, isLoading: groupLoading } = useGroup(groupId)
    const { data: userGroups } = useUserGroups(user?.id)

    const isMember = useMemo(() => {
        if (!user?.id) return false
        return userGroups?.some((g) => g.id === groupId) ?? false
    }, [user?.id, userGroups, groupId])

    if (groupLoading) {
        return (
            <div className="max-w-2xl mx-auto p-4 space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    if (!group) {
        return (
            <div className="max-w-2xl mx-auto p-4">
                <p className="text-center text-red-500">Groupe introuvable.</p>
            </div>
        )
    }

    const normalizedGroup = {
        ...group,
        joinedByUser: isMember,
    }

    return (
        <div className="max-w-3xl mx-auto p-4 space-y-6">
            <Card className="border border-border/70 bg-card p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{group.name}</h1>
                        <p className="text-muted-foreground">
                            {group.description || 'Aucune description pour ce groupe.'}
                        </p>
                    </div>
                    <GroupJoinToggle group={normalizedGroup} />
                </div>
            </Card>

            {!isMember ? (
                <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-md shadow-sm">
                    <p className="mb-2">Vous devez rejoindre ce groupe pour accéder aux publications.</p>
                </div>
            ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                        <TabsTrigger value="publications">Publications</TabsTrigger>
                        <TabsTrigger value="actualite">Actualité</TabsTrigger>
                    </TabsList>

                    <TabsContent value="publications">
                        <div className="space-y-6">
                            <PostFormByGroup groupId={groupId} />
                            <PostListByGroup groupId={groupId} />
                        </div>
                    </TabsContent>

                    <TabsContent value="actualite">
                        <TechWatchList groupId={groupId} />
                    </TabsContent>
                </Tabs>
            )}
        </div>
    )
}
