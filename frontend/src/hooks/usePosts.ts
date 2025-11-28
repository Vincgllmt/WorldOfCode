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
import { useQuery, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import type {
  CreatePostPayload,
  UpdatePostPayload,
  Post,
  Liker,
} from '@/interfaces/post'
import { useAuth } from '@/hooks/useAuth'

const postsKey = ['posts'] as const
const infinitePostsKey = ['posts', 'infinite'] as const
const postKey = (id: number | string) => ['post', id] as const
const groupPostsKey = (groupId: number) => ['posts', 'group', groupId] as const
const likersKey = (postId: number) => [...postKey(postId), 'likers'] as const

const invalidatePostLists = (queryClient: QueryClient) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: postsKey }),
    queryClient.invalidateQueries({ queryKey: infinitePostsKey, exact: false }),
  ])

// -------------------------
// LISTES / CRUD DE BASE
// -------------------------
export const usePosts = (enabled = true) => {
  const { data: posts, isLoading, error } = useQuery<Post[]>({
    queryKey: postsKey,
    queryFn: getAllPosts,
    enabled,
  })
  return { posts, isLoading, error }
}

export const useCreatePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreatePostPayload) => createPost(data),
    onSuccess: async () => {
      await invalidatePostLists(queryClient)
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
    onSuccess: async () => {
      await invalidatePostLists(queryClient)
      toast.success('Post mis à jour avec succès ✏️')
    },
    onError: () => toast.error('Erreur lors de la mise à jour du post ❌'),
  })
}

export const useDeletePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: async () => {
      await invalidatePostLists(queryClient)
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

// -------------------------
// LIKES / LIKERS
// -------------------------
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
  currentUser?: { id: number; username: string } // pour l’optimistic update de la liste des likers
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
      return likedByMe ? unlikePost(postId) : likePost(postId)
    },

    onMutate: async ({ postId, likedByMe, groupId, currentUser }: ToggleLikeArgs): Promise<ToggleLikeContext> => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: likersKey(postId) }),
        queryClient.cancelQueries({ queryKey: postsKey }),
        groupId ? queryClient.cancelQueries({ queryKey: groupPostsKey(groupId) }) : Promise.resolve(),
        queryClient.cancelQueries({ queryKey: postKey(postId) }),
      ])

      const previousLikers = queryClient.getQueryData<Liker[]>(likersKey(postId))
      const previousPosts = queryClient.getQueryData<Post[]>(postsKey)
      const previousGroupPosts = groupId ? queryClient.getQueryData<Post[]>(groupPostsKey(groupId)) : undefined
      const previousPost = queryClient.getQueryData<Post>(postKey(postId))

      // on met à jour la liste des likers
      if (currentUser) {
        queryClient.setQueryData<Liker[]>(likersKey(postId), (prev) => {
          const list = prev ?? []
          const exists = list.some((u) => u.id === currentUser.id)
          if (likedByMe && exists) return list.filter((u) => u.id !== currentUser.id) // unlike
          if (!likedByMe && !exists) return [...list, currentUser] // like
          return list
        })
      }

      //  on met aussi à jour la/les entités Post
      const togglePost = (p: Post): Post => ({
        ...p,
        likedByMe: !likedByMe,
        likesCount: (p.likesCount ?? 0) + (likedByMe ? -1 : 1),
      })

      queryClient.setQueryData<Post[]>(postsKey, (prev) =>
        prev ? prev.map((p) => (p.id === postId ? togglePost(p) : p)) : prev
      )
      if (groupId) {
        queryClient.setQueryData<Post[]>(groupPostsKey(groupId), (prev) =>
          prev ? prev.map((p) => (p.id === postId ? togglePost(p) : p)) : prev
        )
      }
      queryClient.setQueryData<Post>(postKey(postId), (prev) => (prev ? togglePost(prev) : prev))

      return { previousLikers, previousPosts, previousGroupPosts, previousPost, postId, groupId }
    },

    onError: (error, variables, context) => {
      if (!context) return
      const { postId, groupId } = context
      queryClient.setQueryData(likersKey(postId), context.previousLikers)
      queryClient.setQueryData(postsKey, context.previousPosts)
      if (groupId) queryClient.setQueryData(groupPostsKey(groupId), context.previousGroupPosts)
      queryClient.setQueryData(postKey(postId), context.previousPost)
      toast.error('Impossible de mettre à jour le like ❌')
    },

    onSuccess: (_data, variables) => {
      // revalide la liste des likers pour être parfaitement aligné serveur
      queryClient.invalidateQueries({ queryKey: likersKey(variables.postId) })
    },
  })
}

// -------------------------
// PARTAGE / REPORT
// -------------------------
export const useSharePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: number) => sharePost(postId),

    onMutate: async (postId: number) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: postsKey }),
        queryClient.cancelQueries({ queryKey: infinitePostsKey, exact: false }),
        queryClient.cancelQueries({ queryKey: postKey(postId) }),
      ])
      const previousPosts = queryClient.getQueryData<Post[]>(postsKey)
      const previousPost  = queryClient.getQueryData<Post>(postKey(postId))

      const bump = (p: Post): Post =>
        ({ ...p, sharesCount: (p.sharesCount ?? 0) + 1 })

      // liste
      queryClient.setQueryData<Post[]>(postsKey, prev =>
        prev ? prev.map(p => (p.id === postId ? bump(p) : p)) : prev
      )
      // détail
      queryClient.setQueryData<Post>(postKey(postId), prev => prev ? bump(prev) : prev)

      return { previousPosts, previousPost, postId }
    },

    onError: (_error, _variables, context) => {
      if (!context) return
      queryClient.setQueryData(postsKey, context.previousPosts)
      queryClient.setQueryData(postKey(context.postId), context.previousPost)
      toast.error('Erreur lors du partage ❌')
    },

    onSuccess: () => {
      toast.success('Post partagé 🎉')
    },

    onSettled: async (_data, _error, variables) => {
      await invalidatePostLists(queryClient)
      queryClient.invalidateQueries({ queryKey: postKey(variables) })
    }
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

// -------------------------
// Helper “état like” basé sur les likers
// -------------------------
export const usePostLikeState = (postId: number, groupId?: number) => {
  const { user } = useAuth()
  const { data: likers } = useLikers(postId)
  const toggleLike = useToggleLike()

  const myId = user?.id != null ? Number(user.id) : undefined
  const likedByMe = myId != null && !!likers?.some((u) => u.id === myId)
  const likesCount = likers?.length ?? 0

  const onToggle = () => {
    // si l'user n'est pas encore chargé, on ne tente pas le toggle
    if (myId == null || !user) return
    toggleLike.mutate({
      postId,
      likedByMe,
      groupId,
      currentUser: { id: myId, username: user.username },
    })
  }

  return { likedByMe, likesCount, onToggle, isPending: toggleLike.isPending }
}
