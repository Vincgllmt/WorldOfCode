import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { SessionAppointment } from '@/types/mentoring'

export async function getSessionAppointments(sessionId: number): Promise<SessionAppointment[]> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/appointments`)
  if (!res.ok) throw new Error('Erreur chargement rendez-vous')
  return res.json()
}

export async function createSessionAppointment(
  sessionId: number,
  data: { scheduledAt: string; format?: string },
): Promise<SessionAppointment> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/appointments`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur création rendez-vous')
  return res.json()
}

export async function getSessionAppointment(sessionId: number, appointmentId: number): Promise<SessionAppointment> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/appointments/${appointmentId}`)
  if (!res.ok) throw new Error('Rendez-vous introuvable')
  return res.json()
}

export async function confirmSessionAppointment(sessionId: number, appointmentId: number): Promise<SessionAppointment> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/appointments/${appointmentId}/confirm`, {
    method: 'PATCH',
  })
  if (!res.ok) throw new Error('Erreur confirmation rendez-vous')
  return res.json()
}

export async function refuseSessionAppointment(sessionId: number, appointmentId: number): Promise<SessionAppointment> {
  const res = await fetchWithAuth(`/mentoring/sessions/${sessionId}/appointments/${appointmentId}/refuse`, {
    method: 'PATCH',
  })
  if (!res.ok) throw new Error('Erreur refus rendez-vous')
  return res.json()
}

export async function deleteSessionAppointment(sessionId: number, appointmentId: number): Promise<void> {
  await fetchWithAuth(`/mentoring/sessions/${sessionId}/appointments/${appointmentId}`, {
    method: 'DELETE',
  })
}
