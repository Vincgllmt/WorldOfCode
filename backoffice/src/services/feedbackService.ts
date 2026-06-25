import { getCookie } from 'cookies-next'
import { AdminFeedback } from '@/interfaces/adminFeedback'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getAdminFeedbacks = async (): Promise<AdminFeedback[]> => {
  const token = getCookie('admin_token')
  const res = await fetch(`${API_URL}/api/feedback`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des feedbacks')
  return res.json()
}

export const updateFeedbackStatus = async (
  id: number,
  status: 'new' | 'read' | 'processed'
): Promise<AdminFeedback> => {
  const token = getCookie('admin_token')
  const res = await fetch(`${API_URL}/api/feedback/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status }),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du statut')
  return res.json()
}
