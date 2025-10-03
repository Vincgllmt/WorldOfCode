
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  getGroupById
} from '@/services/groupService'
import { CreateGroupPayload, UpdateGroupPayload } from '@/interfaces/group'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export const useGroups = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['groups'],
    queryFn: getGroups
  })

  return {
    groups: data,
    isLoading,
    error
  }
}

export const useGroup = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => getGroupById(id),
    enabled: !!id && (options?.enabled ?? true),
    ...options, // permet de surcharger si besoin (staleTime, retry, etc.)
  })
}

export const useCreateGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGroupPayload) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Groupe créé avec succès ✅')
    },
    onError: () => {
      toast.error('Erreur lors de la création du groupe ❌')
    }
  })
}

export const useUpdateGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateGroupPayload) => updateGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Groupe mis à jour avec succès ✏️')
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour ❌')
    }
  })
}

export const useDeleteGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      toast.success('Groupe supprimé avec succès 🗑️')
    },
    onError: () => {
      toast.error('Erreur lors de la suppression ❌')
    }
  })
}

export const useJoinGroup = () => {
  const queryClient = useQueryClient()
  const Router = useRouter()
  return useMutation({

    mutationFn: (id: number) => joinGroup(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group', id] })
      toast.success('Groupe rejoint avec succès 🙌')
      Router.refresh()
    },
    onError: () => {
      toast.error('Erreur lors de la tentative de rejoindre le groupe ❌')
    }
  })
}
