import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { updateUserProfile, updateUserSkills, createUserLink } from '@/services/userService'
import { getAllSkills } from '@/services/skillService'
import type { Skill, UpdateProfilePayload, CreateLinkPayload, UserLink } from '@/interfaces/user'
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
