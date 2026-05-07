import { fetchWithAuth } from '@/lib/fetchWithAuth'

export interface JuniorStats {
  totalSessions: number
  activeSessions: number
  completedSessions: number
  totalMentors: number
  totalRequests: number
  averageRating: number | null
}

export async function getJuniorStats(): Promise<JuniorStats> {
  const res = await fetchWithAuth('/mentoring/junior/stats')
  if (!res.ok) throw new Error('Impossible de charger les stats')
  return res.json()
}
