import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { MentoringSession } from '@/types/mentoring'

export async function getMentorActiveSessions(): Promise<MentoringSession[]> {
  const res = await fetchWithAuth('/mentor/sessions')
  if (!res.ok) throw new Error('Erreur sessions actives')
  return res.json()
}

export async function getJuniorSessions(): Promise<MentoringSession[]> {
  const res = await fetchWithAuth('/mentoring/sessions/mine')
  if (!res.ok) throw new Error('Erreur sessions junior')
  return res.json()
}

export async function getSession(id: number): Promise<MentoringSession> {
  const res = await fetchWithAuth(`/mentoring/sessions/${id}`)
  if (!res.ok) throw new Error('Session introuvable')
  return res.json()
}

export async function startSession(id: number): Promise<MentoringSession> {
  const res = await fetchWithAuth(`/mentoring/sessions/${id}/start`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Erreur démarrage session')
  return res.json()
}

export async function completeSession(id: number): Promise<MentoringSession> {
  const res = await fetchWithAuth(`/mentoring/sessions/${id}/complete`, { method: 'PATCH' })
  if (!res.ok) throw new Error('Erreur clôture session')
  return res.json()
}

export async function confirmSessionSchedule(id: number, scheduledAt: string): Promise<MentoringSession> {
  const res = await fetchWithAuth(`/mentoring/sessions/${id}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ scheduledAt }),
  })
  if (!res.ok) throw new Error('Erreur confirmation de date')
  return res.json()
}
