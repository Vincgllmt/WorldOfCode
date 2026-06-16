import { getCookie } from 'cookies-next'

import { ArenaChallenge, ArenaChallengeDetail, LeaderboardEntry, RunResult, SubmitResult } from '@/interfaces/arena'

export type { RunResult, SubmitResult, ArenaChallengeDetail }

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

export const getChallenge = async (slug: string): Promise<ArenaChallengeDetail> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/challenges/${slug}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error('Défi introuvable ou service indisponible')
  }

  return res.json()
}

export const runCode = async (language: string, code: string, stdin?: string): Promise<RunResult> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ language, code, ...(stdin !== undefined ? { stdin } : {}) }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? "Erreur lors de l'exécution du code")
  }

  return res.json()
}

export const submitCode = async (slug: string, language: string, code: string): Promise<SubmitResult> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/challenges/${slug}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ language, code }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? 'Erreur lors de la soumission')
  }

  return res.json()
}
