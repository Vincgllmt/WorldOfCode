import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { MentoringSession } from '@/types/mentoring'

export async function getMentorActiveSessions(): Promise<MentoringSession[]> {
  const res = await fetchWithAuth('/api/mentor/sessions')
  if (!res.ok) throw new Error('Erreur sessions actives')
  return res.json()
}

export async function getJuniorSessions(): Promise<MentoringSession[]> {
  const res = await fetchWithAuth('/api/mentoring/sessions/mine')
  if (!res.ok) throw new Error('Erreur sessions junior')
  return res.json()
}

export async function startSession(id: number): Promise<MentoringSession> {
  const res = await fetchWithAuth(`/api/mentoring/sessions/${id}/start`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Erreur démarrage session')
  return res.json()
}
