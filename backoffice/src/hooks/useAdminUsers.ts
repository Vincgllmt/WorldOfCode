import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllAdminUsers, updateAdminUserRole } from '@/services/adminService'
import { deleteUser } from '@/services/userService'

export const useAdminUsers = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: getAllAdminUsers,
  })
  return { users: data, isLoading, error }
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
