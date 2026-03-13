import { getCookie } from 'cookies-next'
import type { SuggestedUser } from '@/interfaces/suggestion'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export async function getSuggestedUsers(
  limit: number = 5,
  offset: number = 0
): Promise<SuggestedUser[]> {
  const token = getCookie('token')
  const res = await fetch(
    `${API_URL}/suggestions/users?limit=${limit}&offset=${offset}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!res.ok) throw new Error('Erreur lors du chargement des suggestions')
  return res.json()
}
