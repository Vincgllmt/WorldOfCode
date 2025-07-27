import {
  getAllPosts,
  createPost,
  updatePost,
  deletePost,
  getPostsByGroupId
} from '@/services/postService'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import {
  CreatePostPayload,
  UpdatePostPayload,
  Post
} from '@/interfaces/post'

//  GET all posts
export const usePosts = () => {
  const { data: posts, isLoading, error } = useQuery<Post[]>({
    queryKey: ['posts'],
    queryFn: getAllPosts
  })

  return { posts, isLoading, error }
}

// CREATE post
export const useCreatePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreatePostPayload) => createPost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post publié avec succès 🎉')
    },
    onError: () => toast.error('Erreur lors de la création du post ❌')
  })
}

//  UPDATE post
export const useUpdatePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePostPayload }) =>
      updatePost(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post mis à jour avec succès ✏️')
    },
    onError: () => toast.error('Erreur lors de la mise à jour du post ❌')
  })
}

//  DELETE post
export const useDeletePost = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      toast.success('Post supprimé avec succès 🗑️')
    },
    onError: () => toast.error('Erreur lors de la suppression du post ❌')
  })
}

export const usePostsByGroup = (groupId: number, enabled = true) => {
  return useQuery({
    queryKey: ['posts', 'group', groupId],
    queryFn: () => getPostsByGroupId(groupId),
    enabled: !!groupId && enabled
  })
}
