import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { updateUserProfile, updateUserSkills, createUserLink, updateUserLink, deleteUserLink } from '@/services/userService'
import { getAllSkills } from '@/services/skillService'
import type { Skill, UpdateProfilePayload, CreateLinkPayload, UserLink } from '@/interfaces/user'
import type { LinksFormValues } from '@/interfaces/user.schemas'
import toast from 'react-hot-toast'

export const useSkills = () => {
  return useQuery<Skill[]>({
    queryKey: ['skills'],
    queryFn: getAllSkills,
    staleTime: 10 * 60 * 1000,
  })
}

export const useUpdateProfile = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateProfilePayload) => updateUserProfile(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user!.id, 'profile-onboarding'] })
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde du profil')
    },
  })
}

export const useUpdateSkills = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (skillIds: number[]) => updateUserSkills(user!.id, skillIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user!.id, 'profile-onboarding'] })
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde des compétences')
    },
  })
}

export const useCreateLink = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateLinkPayload) => createUserLink(user!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user!.id, 'profile-onboarding'] })
    },
    onError: () => {
      toast.error('Erreur lors de la sauvegarde du lien')
    },
  })
}

export const useUpdateLink = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ linkId, data }: { linkId: number; data: CreateLinkPayload }) =>
      updateUserLink(user!.id, linkId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user!.id, 'profile-onboarding'] })
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour du lien')
    },
  })
}

export const useDeleteLink = () => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (linkId: number) => deleteUserLink(user!.id, linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', user!.id, 'profile-onboarding'] })
    },
    onError: () => {
      toast.error('Erreur lors de la suppression du lien')
    },
  })
}

/**
 * Synchronise les liens du formulaire avec ceux en base :
 * supprime les liens retirés, met à jour les modifiés, crée les nouveaux.
 */
export const useSyncLinks = () => {
  const createLink = useCreateLink()
  const updateLink = useUpdateLink()
  const deleteLink = useDeleteLink()

  const syncLinks = async (existingLinks: UserLink[], formLinks: LinksFormValues['links']) => {
    const keptIds = new Set(formLinks.map((link) => link.id).filter((id) => id !== undefined))

    for (const link of existingLinks) {
      if (!keptIds.has(link.id)) {
        await deleteLink.mutateAsync(link.id)
      }
    }

    for (const link of formLinks) {
      const payload = { type: link.type, url: link.url }
      if (link.id === undefined) {
        await createLink.mutateAsync(payload)
        continue
      }
      const original = existingLinks.find((l) => l.id === link.id)
      if (original && (original.type !== link.type || original.url !== link.url)) {
        await updateLink.mutateAsync({ linkId: link.id, data: payload })
      }
    }
  }

  return {
    syncLinks,
    isPending: createLink.isPending || updateLink.isPending || deleteLink.isPending,
  }
}
