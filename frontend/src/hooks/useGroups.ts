
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  joinGroup,
  leaveGroup,
  getGroupById
} from '@/services/groupService'
import { CreateGroupPayload, Group, UpdateGroupPayload } from '@/interfaces/group'
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
    ...options, 
  })
}

export const useCreateGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateGroupPayload) => createGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: () => {
      toast.error('Erreur lors de la création du groupe')
    }
  })
}

export const useUpdateGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateGroupPayload) => updateGroup(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour')
    }
  })
}

export const useDeleteGroup = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: number) => deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: () => {
      toast.error('Erreur lors de la suppression')
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
      Router.refresh()
    },
    onError: () => {
      toast.error('Erreur lors de la tentative de rejoindre le groupe')
    }
  })
}

export const useToggleGroupMembership = () => {
  const queryClient = useQueryClient()

  type ToggleInput = {
    groupId: number
    currentlyJoined: boolean
  }

  type ToggleContext = {
    previousGroups?: Group[]
    previousGroup?: Group
  }

  return useMutation<boolean, Error, ToggleInput, ToggleContext>({
    mutationFn: async ({ groupId, currentlyJoined }) => {
      if (currentlyJoined) {
        await leaveGroup(groupId)
        return false
      }
      await joinGroup(groupId)
      return true
    },
    onMutate: async ({ groupId, currentlyJoined }) => {
      await queryClient.cancelQueries({ queryKey: ['groups'] })
      await queryClient.cancelQueries({ queryKey: ['group', groupId] })
      await queryClient.cancelQueries({ queryKey: ['user-groups'] })

      const previousGroups = queryClient.getQueryData<Group[]>(['groups'])
      const previousGroup = queryClient.getQueryData<Group>(['group', groupId])

      queryClient.setQueryData<Group[]>(['groups'], (old) =>
        old
          ? old.map((g) =>
              g.id === groupId ? { ...g, joinedByUser: !currentlyJoined } : g
            )
          : old
      )

      queryClient.setQueryData<Group>(['group', groupId], (old) =>
        old ? { ...old, joinedByUser: !currentlyJoined } : old
      )

      return { previousGroups, previousGroup }
    },
    onError: (_error, { groupId }, context) => {
      if (context?.previousGroups) {
        queryClient.setQueryData(['groups'], context.previousGroups)
      }
      if (context?.previousGroup) {
        queryClient.setQueryData(['group', groupId], context.previousGroup)
      }
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      toast.error('Action impossible')
    },
    onSuccess: () => {},
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['group', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
    },
  })
}
