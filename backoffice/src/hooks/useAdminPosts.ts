import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllAdminPosts } from '@/services/adminService'
import { deletePost } from '@/services/postService'

export const useAdminPosts = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminPosts'],
    queryFn: getAllAdminPosts,
  })
  return { posts: data ?? [], isLoading, error }
}

export const useAdminDeletePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPosts'] }),
  })
}
