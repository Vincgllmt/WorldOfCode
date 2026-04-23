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

export interface AdminUsersParams {
  page: number
  limit: number
  search?: string
  role?: string
  dateFrom?: string
  dateTo?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export interface AdminUsersPaginatedResponse {
  items: AdminUserListItem[]
  total: number
  page: number
  limit: number
}

export const getAdminUsersPaginated = async (params: AdminUsersParams): Promise<AdminUsersPaginatedResponse> => {
  const token = getCookie('token')
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.search)    query.set('search', params.search)
  if (params.role)      query.set('role', params.role)
  if (params.dateFrom)  query.set('dateFrom', params.dateFrom)
  if (params.dateTo)    query.set('dateTo', params.dateTo)
  if (params.sortField) query.set('sortField', params.sortField)
  if (params.sortDir)   query.set('sortDir', params.sortDir.toUpperCase())

  const res = await fetch(`${API_URL}/api/admin/users?${query.toString()}`, {
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

export const updateAdminUserRole = async (id: number, role: 'ROLE_USER' | 'ROLE_ADMIN'): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/users/${id}/role`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ role }),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du rôle')
}

export interface AdminPostsParams {
  page: number
  limit: number
  search?: string
  minReports?: number
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export interface AdminPostsPaginatedResponse {
  items: AdminPostListItem[]
  total: number
  page: number
  limit: number
}

export const getAdminPostsPaginated = async (params: AdminPostsParams): Promise<AdminPostsPaginatedResponse> => {
  const token = getCookie('token')
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.search)                    query.set('search', params.search)
  if (params.minReports && params.minReports > 0) query.set('minReports', String(params.minReports))
  if (params.sortField)                 query.set('sortField', params.sortField)
  if (params.sortDir)                   query.set('sortDir', params.sortDir.toUpperCase())

  const res = await fetch(`${API_URL}/api/admin/posts?${query.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des posts')
  return res.json()
}

