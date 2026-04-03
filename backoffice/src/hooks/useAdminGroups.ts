import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminGroupService } from '@/services/adminGroupService'
import toast from 'react-hot-toast'

export function useAdminGroups() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-groups'],
    queryFn: adminGroupService.getGroups,
  })
  return { groups: data ?? [], isLoading }
}

export function useCreateAdminGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminGroupService.createGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      toast.success('Groupe créé')
    },
    onError: () => toast.error('Erreur lors de la création'),
  })
}

export function useUpdateAdminGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminGroupService.updateGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      toast.success('Groupe mis à jour')
    },
    onError: () => toast.error('Erreur lors de la mise à jour'),
  })
}

export function useDeleteAdminGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: adminGroupService.deleteGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-groups'] })
      toast.success('Groupe supprimé')
    },
    onError: () => toast.error('Erreur lors de la suppression'),
  })
}
