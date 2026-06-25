import { useQuery } from '@tanstack/react-query'
import { getAdminMentors, getAdminMentorDetail } from '@/services/mentorAdminService'

export const useAdminMentors = (params: { q?: string; isAvailable?: boolean }) => {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['adminMentors', params],
    queryFn: () => getAdminMentors(params),
  })
  return { mentors: data, isLoading, error: error ? 'Erreur lors du chargement des mentors.' : null }
}

export const useAdminMentorDetail = (id: number | null) => {
  const { data, isLoading } = useQuery({
    queryKey: ['adminMentorDetail', id],
    queryFn: () => getAdminMentorDetail(id!),
    enabled: id !== null,
  })
  return { detail: data ?? null, isLoading }
}
