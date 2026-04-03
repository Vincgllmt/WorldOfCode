import { getCookie } from 'cookies-next'
import { AdminReport } from '@/interfaces/adminReport'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getAdminReports = async (): Promise<AdminReport[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/reports`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des reports')
  return res.json()
}

export const claimReport = async (id: number): Promise<AdminReport> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/reports/${id}/claim`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Erreur lors de la prise en charge')
  }
  return res.json()
}

export const resolveReport = async (id: number, resolutionNote?: string): Promise<AdminReport> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/reports/${id}/resolve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ resolutionNote }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Erreur lors de la résolution')
  }
  return res.json()
}

export const rejectReport = async (id: number, resolutionNote: string): Promise<AdminReport> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/reports/${id}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ resolutionNote }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Erreur lors du rejet')
  }
  return res.json()
}
