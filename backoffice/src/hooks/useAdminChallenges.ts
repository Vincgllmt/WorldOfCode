import { useMutation, useQuery } from '@tanstack/react-query'
import { getAdminChallenges, getAdminChallengeDetail, verifyChallengeSolution } from '@/services/codeArenaService'

export const useAdminChallenges = () => {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['adminChallenges'],
    queryFn: getAdminChallenges,
  })
  return { challenges: data, isLoading, error: error ? 'Erreur lors du chargement des jeux.' : null }
}

export const useAdminChallengeDetail = (slug: string | null) => {
  const { data, isLoading } = useQuery({
    queryKey: ['adminChallengeDetail', slug],
    queryFn: () => getAdminChallengeDetail(slug!),
    enabled: slug !== null,
  })
  return { detail: data ?? null, isLoading }
}

export const useVerifySolution = () =>
  useMutation({
    mutationFn: ({ slug, language }: { slug: string; language: string }) => verifyChallengeSolution(slug, language),
  })
