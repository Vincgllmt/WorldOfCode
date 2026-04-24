import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminPostsPaginated, AdminPostsParams } from '@/services/adminService'
import { deletePost } from '@/services/postService'

export const useAdminPosts = (params: AdminPostsParams) => {
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['adminPosts', params],
    queryFn: () => getAdminPostsPaginated(params),
    placeholderData: (prev) => prev,
  })
  return {
    posts: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
  }
}

export const useAdminDeletePost = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPosts'] }),
  })
}
