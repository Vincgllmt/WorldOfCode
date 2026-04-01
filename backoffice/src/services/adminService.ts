import { getCookie } from 'cookies-next'
import { AdminStats } from '@/interfaces/adminStats'
import { AdminActivityPoint } from '@/interfaces/adminActivity'
import { AdminRecentEvent } from '@/interfaces/adminRecentEvent'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getAdminStats = async (): Promise<AdminStats> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/stats`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des statistiques admin')
  return res.json()
}

export const getAdminActivity = async (days: number): Promise<AdminActivityPoint[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/activity?days=${days}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error("Erreur lors du chargement de l'activité")
  return res.json()
}

export const getAdminRecentActivity = async (): Promise<AdminRecentEvent[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/recent-activity`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error("Erreur lors du chargement de l'activité récente")
  return res.json()
}
