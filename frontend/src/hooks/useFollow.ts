import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
} from '@/services/followService'
import type { Follower, Following } from '@/interfaces/follow'

// --- FOLLOWERS (GET) ---
export const useFollowers = (userId?: number) => {
  const { data: followers, isLoading, error } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => {
      if (typeof userId !== 'number') {
        return Promise.resolve([] as Follower[])
      }
      return getFollowers(userId)
    },
    enabled: typeof userId === 'number',
  })

  return { followers, isLoading, error }
}

// --- FOLLOWING (GET) ---
export const useFollowing = (userId?: number) => {
  const { data: following, isLoading, error } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => {
      if (typeof userId !== 'number') {
        return Promise.resolve([] as Following[])
      }
      return getFollowing(userId)
    },
    enabled: typeof userId === 'number',
  })

  return { following, isLoading, error }
}

// --- FOLLOW (POST) ---
export const useFollowUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: followUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
    },
    onError: () => toast.error('Erreur lors du suivi de l\u2019utilisateur'),
  })
}

// --- UNFOLLOW (DELETE) ---
export const useUnfollowUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unfollowUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
    },
    onError: () => toast.error('Erreur lors du d\u00e9sabonnement de l\u2019utilisateur'),
  })
}
