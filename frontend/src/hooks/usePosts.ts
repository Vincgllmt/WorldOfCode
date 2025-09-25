import {
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  getPostsByGroupId,
  sharePost,
  reportPost,
  unlikePost,
  likePost,
  getLikers,
} from '@/services/postService'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CreatePostPayload,
  UpdatePostPayload,
  Post,
  Liker,
} from '@/interfaces/post'
import { useAuth } from '@/hooks/useAuth'

// ---------- LISTES / CRUD DE BASE ----------
export const usePosts = () => {
  const { data: posts, isLoading, error } = useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: getAllPosts,
  })
  return { posts, isLoading, error }
}

export const useCreatePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostPayload) => createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post publié avec succès 🎉')
    },
    onError: () => toast.error('Erreur lors de la création du post ❌'),
  })
}

export const useUpdatePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePostPayload }) =>
      updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post mis à jour avec succès ✏️')
    },
    onError: () => toast.error('Erreur lors de la mise à jour du post ❌'),
  })
}

export const useDeletePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post supprimé avec succès 🗑️')
    },
    onError: () => toast.error('Erreur lors de la suppression du post ❌'),
  })
}

export const usePostsByGroup = (groupId: number, enabled = true) => {
  return useQuery({
    queryKey: ['posts', 'group', groupId],
    queryFn: () => getPostsByGroupId(groupId),
    enabled: !!groupId && enabled,
  })
}

// ---------- LIKES / LIKERS ----------
const postsKey = ['posts']
const postKey = (id: number | string) => ['post', id]
const groupPostsKey = (groupId: number) => ['posts', 'group', groupId]
const likersKey = (postId: number) => [...postKey(postId), 'likers']

export const useLikers = (postId: number) => {
  return useQuery<Liker[]>({
    queryKey: likersKey(postId),
    queryFn: () => getLikers(postId),
    enabled: !!postId,
  })
}

type ToggleLikeArgs = {
  postId: number
  likedByMe?: boolean
  groupId?: number
  currentUser?: { id: number; username: string } // pour mise à jour optimiste de la liste des likers
}

type ToggleLikeContext = {
  previousLikers: Liker[] | undefined
  previousPosts: Post[] | undefined
  previousGroupPosts: Post[] | undefined
  previousPost: Post | undefined
  postId: number
  groupId?: number
}

export const useToggleLike = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, likedByMe }: ToggleLikeArgs) => {
      if (likedByMe) return unlikePost(postId)
      return likePost(postId)
    },

    // Optimistic update (likers + posts caches)
    onMutate: async ({
      postId,
      likedByMe,
      groupId,
      currentUser,
    }: ToggleLikeArgs): Promise<ToggleLikeContext> => {
      // Stoppe les fetchs concurrents
      await Promise.all([
        queryClient.cancelQueries({ queryKey: likersKey(postId) }),
        queryClient.cancelQueries({ queryKey: postsKey }),
        groupId
          ? queryClient.cancelQueries({ queryKey: groupPostsKey(groupId) })
          : Promise.resolve(),
        queryClient.cancelQueries({ queryKey: postKey(postId) }),
      ])

      // Snapshots pour rollback
      const previousLikers = queryClient.getQueryData<Liker[]>(likersKey(postId))
      const previousPosts = queryClient.getQueryData<Post[]>(postsKey)
      const previousGroupPosts = groupId
        ? queryClient.getQueryData<Post[]>(groupPostsKey(groupId))
        : undefined
      const previousPost = queryClient.getQueryData<Post>(postKey(postId))

      // 1) Met à jour la liste des likers
      if (currentUser) {
        queryClient.setQueryData<Liker[]>(likersKey(postId), (prev) => {
          const existing = prev ?? []
          const isAlreadyLiker = existing.some((u) => u.id === currentUser.id)
          if (likedByMe && isAlreadyLiker) {
            // on retire si on était en like
            return existing.filter((u) => u.id !== currentUser.id)
          }
          if (!likedByMe && !isAlreadyLiker) {
            // on ajoute si on n’était pas en like
            return [...existing, currentUser]
          }
          return existing
        })
      }

      // 2) Met à jour les entités Post (liste + détail)
      const applyToggleOnPost = (p: Post): Post => ({
        ...p,
        likedByMe: !likedByMe,
        likesCount: (p.likesCount ?? 0) + (likedByMe ? -1 : 1),
      })

      // liste globale
      queryClient.setQueryData<Post[]>(postsKey, (prev) =>
        prev ? prev.map((p) => (p.id === postId ? applyToggleOnPost(p) : p)) : prev
      )
      // liste du groupe
      if (groupId) {
        queryClient.setQueryData<Post[]>(groupPostsKey(groupId), (prev) =>
          prev ? prev.map((p) => (p.id === postId ? applyToggleOnPost(p) : p)) : prev
        )
      }
      // détail
      queryClient.setQueryData<Post>(postKey(postId), (prev) =>
        prev ? applyToggleOnPost(prev) : prev
      )

      return {
        previousLikers,
        previousPosts,
        previousGroupPosts,
        previousPost,
        postId,
        groupId,
      }
    },

    // Rollback en cas d'erreur
    onError: (error, variables, context) => {
      if (!context) return
      const { postId, groupId } = context
      queryClient.setQueryData(likersKey(postId), context.previousLikers)
      queryClient.setQueryData(postsKey, context.previousPosts)
      if (groupId) {
        queryClient.setQueryData(groupPostsKey(groupId), context.previousGroupPosts)
      }
      queryClient.setQueryData(postKey(postId), context.previousPost)
      toast.error('Impossible de mettre à jour le like ❌')
    },

    // Revalidation légère (liste des likers)
    onSuccess: (_data, variables) => {
      toast.success(variables.likedByMe ? 'Like retiré' : 'Post liké 👍')
      queryClient.invalidateQueries({ queryKey: likersKey(variables.postId) })
    },
  })
}

// ---------- PARTAGE / REPORT ----------
export const useSharePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: number) => sharePost(postId),
    onSuccess: () => {
      toast.success('Post partagé 🎉')
      queryClient.invalidateQueries({ queryKey: postsKey })
    },
    onError: () => toast.error('Erreur lors du partage ❌'),
  })
}

export const useReportPost = () => {
  return useMutation({
    mutationFn: ({ postId, reason }: { postId: number; reason?: string }) =>
      reportPost(postId, reason),
    onSuccess: () => toast.success('Signalement envoyé ✅'),
    onError: () => toast.error('Erreur lors du signalement ❌'),
  })
}

// ---------- Helper “état like” basé sur les likers (persiste au refresh) ----------
export const usePostLikeState = (postId: number, groupId?: number) => {
  const { user } = useAuth()
  const { data: likers } = useLikers(postId)
  const toggleLike = useToggleLike()

  const likedByMe = !!likers?.some((u) => u.id === user?.id)
  const likesCount = likers?.length ?? 0

  const onToggle = () =>
    toggleLike.mutate({
      postId,
      likedByMe,
      groupId,
      currentUser: user ? { id: user.id, username: user.username } : undefined,
    })

  return {
    likedByMe,
    likesCount,
    onToggle,
    isPending: toggleLike.isPending,
  }
}
