import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllAdminUsers } from '@/services/adminService'
import { updateUser, deleteUser } from '@/services/userService'
import { UpdateUserPayload } from '@/interfaces/user'

export const useAdminUsers = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: getAllAdminUsers,
  })
  return { users: data, isLoading, error }
}

export const useAdminUpdateUser = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: UpdateUserPayload) => updateUser(data),
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
