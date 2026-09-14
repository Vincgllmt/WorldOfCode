import { getCookie } from 'cookies-next'
import { AdminChallenge, AdminChallengeDetail, SolutionVerification } from '@/interfaces/adminChallenge'

// Code Arena est un microservice distinct (port 8082 en local). En prod il est servi
// sous le même domaine que l'API (/api/arena via l'ingress), d'où le repli sur API_URL.
const ARENA_API_URL =
  process.env.NEXT_PUBLIC_ARENA_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

const authHeaders = () => ({ Authorization: `Bearer ${getCookie('admin_token')}` })

export const getAdminChallenges = async (): Promise<AdminChallenge[]> => {
  const res = await fetch(`${ARENA_API_URL}/api/arena/admin/challenges`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur lors du chargement des jeux')
  return res.json()
}

export const getAdminChallengeDetail = async (slug: string): Promise<AdminChallengeDetail> => {
  const res = await fetch(`${ARENA_API_URL}/api/arena/admin/challenges/${slug}`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erreur lors du chargement du jeu')
  return res.json()
}

export const verifyChallengeSolution = async (slug: string, language: string): Promise<SolutionVerification> => {
  const res = await fetch(`${ARENA_API_URL}/api/arena/admin/challenges/${slug}/solutions/${language}/verify`, {
    method: 'POST',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Erreur lors de la vérification de la solution')
  return res.json()
}
