import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllUsers, updateUser, deleteUser, getUserGroups, getUserById, changeUserPassword } from '@/services/userService'
import { ChangePasswordPayload, UpdateUserPayload } from '@/interfaces/user'
import toast from 'react-hot-toast'
import { Group } from '@/interfaces/group'

export const useUsers = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: getAllUsers
  })

  return {
    users: data,
    isLoading,
    error
  }
}

export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserPayload) => updateUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur mis à jour ✅')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour ❌')
    }
  })
}

export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Utilisateur supprimé 🗑️')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression ❌')
    }
  })
}

export const useUserGroups = (userId?: number) => {
  return useQuery<Group[]>({
    queryKey: ['user-groups', userId],
    queryFn: () => getUserGroups(userId!),
    enabled: typeof userId === 'number',
  })
}


export const useUser = (userId: number | undefined) => {
  return useQuery({
    queryKey: ['user', userId],
    queryFn: () => getUserById(userId!),
    enabled: typeof userId === 'number',
  })
}

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) => changeUserPassword(data),
    onSuccess: () => {
      toast.success('Mot de passe mis à jour 🔐')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du mot de passe ❌')
    }
  })
}
