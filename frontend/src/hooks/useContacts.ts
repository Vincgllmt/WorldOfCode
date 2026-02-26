import { useMemo } from 'react'
import { useFollowers, useFollowing } from '@/hooks/useFollow'
import { useAuth } from '@/hooks/useAuth'

export type Contact = {
    id: number
    username: string
    relation: 'follower' | 'following' | 'mutual'
}

export function useContacts() {
    const { user } = useAuth()
    const userId = user?.id
    const { followers, isLoading: isLoadingFollowers } = useFollowers(userId)
    const { following, isLoading: isLoadingFollowing } = useFollowing(userId)

    const contacts = useMemo<Contact[]>(() => {
        const followerIds = new Set(followers?.map((f) => f.id))

        return (following ?? [])
            .map((followed) => ({
                id: followed.id,
                username: followed.username,
                relation: (followerIds.has(followed.id) ? 'mutual' : 'following') as Contact['relation'],
            }))
            .sort((a, b) => a.username.localeCompare(b.username))
    }, [followers, following])

    return {
        contacts,
        isLoading: isLoadingFollowers || isLoadingFollowing,
    }
}
