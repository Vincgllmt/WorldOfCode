import { fetchWithAuth } from '@/lib/fetchWithAuth'

export async function submitRating(sessionId: number, data: { score: number; comment?: string }) {
  const res = await fetchWithAuth(`/api/mentoring/sessions/${sessionId}/rate`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string; code?: string }
    throw Object.assign(new Error(err.error ?? 'Erreur notation'), { code: err.code })
  }
  return res.json()
}

export async function getSessionRatings(sessionId: number) {
  const res = await fetchWithAuth(`/api/mentoring/sessions/${sessionId}/ratings`)
  if (!res.ok) throw new Error('Erreur ratings')
  return res.json()
}
