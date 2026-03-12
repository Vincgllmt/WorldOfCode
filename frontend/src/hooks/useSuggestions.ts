import { useQuery } from '@tanstack/react-query'
import { getSuggestedUsers } from '@/services/suggestionService'
import type { SuggestedUser } from '@/interfaces/suggestion'

export const useSuggestedUsers = (limit: number = 5) => {
  const { data, isLoading, error } = useQuery<SuggestedUser[]>({
    queryKey: ['suggested-users', limit],
    queryFn: () => getSuggestedUsers(limit),
    staleTime: 5 * 60 * 1000,
  })

  return { suggestedUsers: data ?? [], isLoading, error }
}
