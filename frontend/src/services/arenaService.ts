import { getCookie } from 'cookies-next'

import { ArenaBadge, ArenaChallenge, ArenaChallengeDetail, LeaderboardEntry, RunResult, SubmitResult } from '@/interfaces/arena'
import type { Replay } from '@/components/arena/gameViewer'

export type { RunResult, SubmitResult, ArenaChallengeDetail }

/** Résultat sur un cas de test (essai non noté ou cas d'une soumission). */
export interface TestRunResult {
  index: number
  verdict: 'passed' | 'failed' | 'error'
  score: number
  replay: Replay | null
  playerStderr: string
  error: string | null
}

export interface PlayResult {
  submissionId: number
  verdict: 'passed' | 'failed' | 'error'
  score: number
  testsPassed: number
  testsTotal: number
  results: TestRunResult[]
  badgesAwarded: string[]
}

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

export const getArenaChallenge = async (slug: string): Promise<ArenaChallengeDetail> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/challenges/${slug}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error('Erreur lors du chargement du défi')
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

export const getUserBadges = async (userId: number): Promise<ArenaBadge[]> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/users/${userId}/badges`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!res.ok) {
    throw new Error('Erreur lors du chargement des badges')
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

export const playGame = async (slug: string, language: string, code: string): Promise<PlayResult> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/challenges/${slug}/play`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ language, code }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? 'Erreur lors de la partie')
  }

  return res.json()
}

/**
 * Essai NON noté : exécute le code sur un cas précis (`testIndex`) ou sur tous
 * les cas si `testIndex` est omis. Ne crée aucune soumission, n'attribue aucun badge.
 */
export const runTests = async (
  slug: string,
  language: string,
  code: string,
  testIndex?: number,
): Promise<TestRunResult[]> => {
  const token = getCookie('token')

  const res = await fetch(`${ARENA_API_URL}/api/arena/challenges/${slug}/run-tests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ language, code, ...(testIndex !== undefined ? { testIndex } : {}) }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? "Erreur lors de l'exécution des tests")
  }

  const data = (await res.json()) as { results: TestRunResult[] }
  return data.results
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
