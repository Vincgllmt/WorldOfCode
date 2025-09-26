'use client'

import { useParams } from 'next/navigation'
import { useGroup, useJoinGroup } from '@/hooks/useGroups'
import { useUserGroups } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import PostFormByGroup from '@/components/post/PostFormByGroup'
import PostListByGroup from '@/components/post/PostListByGroup'

export default function GroupPage() {
    const { id } = useParams()
    const groupId = Number(id)
    const queryClient = useQueryClient()

    const { user } = useAuth()
    const { data: group, isLoading: groupLoading } = useGroup(groupId)
    const { data: userGroups } = useUserGroups(user?.id)
    const joinGroup = useJoinGroup()

    const [localMembership, setLocalMembership] = useState(false)

    const isMember = localMembership || userGroups?.some(g => g.id === groupId)

    const handleJoin = () => {
        joinGroup.mutate(groupId, {
            onSuccess: () => {
                setLocalMembership(true)
                queryClient.invalidateQueries({ queryKey: ['userGroups', user?.id] })
                queryClient.invalidateQueries({ queryKey: ['group', groupId] })
                queryClient.invalidateQueries({ queryKey: ['posts', 'group', groupId] })
            },
        })
    }

    if (groupLoading) {
        return (
            <div className="max-w-2xl mx-auto p-4 space-y-4">
                <Skeleton className="h-8 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto p-4 space-y-6">
            <div>
                <h1 className="text-2xl font-bold">{group?.name}</h1>
                <p className="text-muted-foreground">{group?.description}</p>
            </div>

            {!isMember ? (
                <div className="bg-yellow-50 border border-yellow-300 p-4 rounded-md shadow-sm">
                    <p className="mb-2">Vous devez rejoindre ce groupe pour accéder aux publications.</p>
                    <Button onClick={handleJoin} disabled={joinGroup.isPending}>
                        {joinGroup.isPending ? 'Adhésion...' : 'Rejoindre le groupe'}
                    </Button>
                </div>
            ) : (
                <>
                    <PostFormByGroup groupId={groupId} />
                    <PostListByGroup groupId={groupId} />
                </>
            )}
        </div>
    )
}
