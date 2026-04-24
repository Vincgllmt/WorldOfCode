import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminUsersPaginated, AdminUsersParams } from '@/services/adminService'
import { updateAdminUserRole } from '@/services/adminService'
import { deleteUser } from '@/services/userService'

export const useAdminUsers = (params: AdminUsersParams) => {
  const { data, isLoading, error, isFetching } = useQuery({
    queryKey: ['adminUsers', params],
    queryFn: () => getAdminUsersPaginated(params),
    placeholderData: (prev) => prev,
  })
  return {
    users: data?.items ?? [],
    total: data?.total ?? 0,
    isLoading,
    isFetching,
    error,
  }
}

export const useAdminUpdateUserRole = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, role }: { id: number; role: 'ROLE_USER' | 'ROLE_ADMIN' }) =>
      updateAdminUserRole(id, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}

export const useAdminDeleteUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
  })
}
