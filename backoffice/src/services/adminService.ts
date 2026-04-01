import { getCookie } from 'cookies-next'
import { AdminStats } from '@/interfaces/adminStats'

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
