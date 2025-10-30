import { useQuery } from '@tanstack/react-query'
import { useUser } from '@/hooks/useUsers'
import { getPostsByUserId } from '@/services/postService'
import type { PublicUser } from '@/interfaces/user'
import type { Post } from '@/interfaces/post'

type UseUserProfileResult = {
  user: PublicUser | undefined
  isLoading: boolean
  error: Error | null
}

type UseUserPostsResult = {
  posts: Post[]
  isLoading: boolean
  error: Error | null
}

// --- PROFIL UTILISATEUR ---
export const useUserProfile = (userId: number): UseUserProfileResult => {
  const { data, isLoading, error } = useUser(userId, {
    enabled: Number.isFinite(userId) && userId > 0,
  })

  return {
    user: data,
    isLoading,
    error: error ?? null,
  }
}

// --- POSTS UTILISATEUR ---
export const useUserPosts = (userId: number): UseUserPostsResult => {
  const { data: posts, isLoading, error } = useQuery<Post[], Error>({
    queryKey: ['user-posts', userId],
    queryFn: () => getPostsByUserId(userId),
    enabled: Number.isFinite(userId) && userId > 0,
  })

  return {
    posts: posts ?? [],
    isLoading,
    error: error ?? null,
  }
}
