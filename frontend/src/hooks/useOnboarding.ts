import { useQuery, useMutation } from '@tanstack/react-query'
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

  return useMutation({
    mutationFn: (data: UpdateProfilePayload) => updateUserProfile(user!.id, data),
    onError: () => {
      toast.error('Erreur lors de la sauvegarde du profil')
    },
  })
}

export const useUpdateSkills = () => {
  const { user } = useAuth()

  return useMutation({
    mutationFn: (skillIds: number[]) => updateUserSkills(user!.id, skillIds),
    onError: () => {
      toast.error('Erreur lors de la sauvegarde des compétences')
    },
  })
}

export const useCreateLink = () => {
  const { user } = useAuth()

  return useMutation({
    mutationFn: (data: CreateLinkPayload) => createUserLink(user!.id, data),
    onError: () => {
      toast.error('Erreur lors de la sauvegarde du lien')
    },
  })
}
