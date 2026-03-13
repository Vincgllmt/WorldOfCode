import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { SuggestedUser } from '@/interfaces/suggestion'

export async function getSuggestedUsers(
  limit: number = 5,
  offset: number = 0
): Promise<SuggestedUser[]> {
  const res = await fetchWithAuth(
    `/suggestions/users?limit=${limit}&offset=${offset}`
  )

  if (!res.ok) throw new Error('Erreur lors du chargement des suggestions')
  return res.json()
}
