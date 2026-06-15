import { useQuery } from '@tanstack/react-query'

import { getArenaChallenges, getArenaLeaderboard } from '@/services/arenaService'

export const useArenaChallenges = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['arena-challenges'],
    queryFn: getArenaChallenges,
  })

  return {
    challenges: data,
    isLoading,
    error,
  }
}

export const useArenaLeaderboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['arena-leaderboard'],
    queryFn: getArenaLeaderboard,
  })

  return {
    leaderboard: data,
    isLoading,
    error,
  }
}
