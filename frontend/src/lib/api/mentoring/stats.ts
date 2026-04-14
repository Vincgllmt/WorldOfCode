import { fetchWithAuth } from '@/lib/fetchWithAuth'

export interface MentorStats {
  totalSessions: number
  activeSessions: number
  averageRating: number | null
  totalMentees: number
  reliabilityRate: number | null
}

export async function getMentorStats(): Promise<MentorStats> {
  const res = await fetchWithAuth('/api/mentor/stats')
  if (!res.ok) throw new Error('Impossible de charger les stats')
  return res.json()
}
