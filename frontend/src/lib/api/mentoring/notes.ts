import { fetchWithAuth } from '@/lib/fetchWithAuth'

export interface SessionNote {
  id: number
  content: string
  type: 'note' | 'link'
  author: { id: number; username: string }
  createdAt: string
}

export async function getSessionNotes(sessionId: number): Promise<SessionNote[]> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/notes`)
  if (!res.ok) throw new Error('Erreur chargement notes')
  return res.json()
}

export async function createSessionNote(
  sessionId: number,
  data: { content: string; type: 'note' | 'link' }
): Promise<SessionNote> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/notes`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur création note')
  return res.json()
}

export async function deleteSessionNote(sessionId: number, noteId: number): Promise<void> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/notes/${noteId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Erreur suppression note')
}
