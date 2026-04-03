import { getCookie } from 'cookies-next'
import { AdminStats } from '@/interfaces/adminStats'
import { AdminActivityPoint } from '@/interfaces/adminActivity'
import { AdminRecentEvent } from '@/interfaces/adminRecentEvent'
import { AdminUserListItem } from '@/interfaces/adminUser'
import { AdminUserDetail } from '@/interfaces/adminUserDetail'
import { AdminPostListItem } from '@/interfaces/adminPost'
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

export const getAllAdminUsers = async (): Promise<AdminUserListItem[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/users`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des utilisateurs')
  return res.json()
}

export const getAdminUserDetail = async (id: number): Promise<AdminUserDetail> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement du profil utilisateur')
  return res.json()
}

export const getAllAdminPosts = async (): Promise<AdminPostListItem[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/posts`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des posts')
  return res.json()
}

