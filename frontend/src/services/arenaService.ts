import { getCookie } from 'cookies-next'

import { ArenaChallenge, LeaderboardEntry } from '@/interfaces/arena'

// Code Arena est un microservice distinct du backend principal : il a sa propre URL.
const ARENA_API_URL =
  process.env.NEXT_PUBLIC_ARENA_API_URL || 'http://localhost:8082'

export const getArenaChallenges = async (): Promise<ArenaChallenge[]> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/challenges`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error('Erreur lors du chargement des défis')
  }

  return res.json()
}

export const getArenaLeaderboard = async (): Promise<LeaderboardEntry[]> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/leaderboard`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error('Erreur lors du chargement du classement')
  }

  return res.json()
}
