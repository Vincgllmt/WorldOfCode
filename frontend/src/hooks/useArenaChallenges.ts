import { useQuery } from '@tanstack/react-query'

import {
  getArenaChallenge,
  getArenaChallenges,
  getArenaLeaderboard,
} from '@/services/arenaService'

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

export const useArenaChallenge = (slug: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['arena-challenge', slug],
    queryFn: () => getArenaChallenge(slug),
    enabled: !!slug,
  })

  return {
    challenge: data,
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
