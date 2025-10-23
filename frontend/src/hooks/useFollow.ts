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
export const useFollowers = (userId: number) => {
  const { data: followers, isLoading, error } = useQuery({
    queryKey: ['followers', userId],
    queryFn: () => getFollowers(userId),
  })

  return { followers, isLoading, error }
}

// --- FOLLOWING (GET) ---
export const useFollowing = (userId: number) => {
  const { data: following, isLoading, error } = useQuery({
    queryKey: ['following', userId],
    queryFn: () => getFollowing(userId),
  })

  return { following, isLoading, error }
}

// --- FOLLOW (POST) ---
export const useFollowUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: followUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
      toast.success(res.message || 'Utilisateur suivi 🎉')
    },
    onError: () => toast.error('Erreur lors du suivi de l’utilisateur'),
  })
}

// --- UNFOLLOW (DELETE) ---
export const useUnfollowUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: unfollowUser,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
      toast.success(res.message || 'Utilisateur désabonné')
    },
    onError: () => toast.error('Erreur lors du désabonnement de l’utilisateur'),
  })
}
