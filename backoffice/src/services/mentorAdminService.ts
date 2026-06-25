import { getCookie } from 'cookies-next'
import { AdminMentor, AdminMentorDetail } from '@/interfaces/adminMentor'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getAdminMentors = async (params: { q?: string; isAvailable?: boolean }): Promise<AdminMentor[]> => {
  const token = getCookie('admin_token')
  const query = new URLSearchParams()
  if (params.q)                           query.set('q', params.q)
  if (params.isAvailable !== undefined)   query.set('isAvailable', String(params.isAvailable))
  const res = await fetch(`${API_URL}/api/admin/mentors?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des mentors')
  return res.json()
}

export const getAdminMentorDetail = async (id: number): Promise<AdminMentorDetail> => {
  const token = getCookie('admin_token')
  const res = await fetch(`${API_URL}/api/admin/mentors/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement du profil mentor')
  return res.json()
}
