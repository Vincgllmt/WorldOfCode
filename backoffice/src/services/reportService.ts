import { getCookie } from 'cookies-next'
import { AdminReport } from '@/interfaces/adminReport'
import { AdminReportedPost } from '@/interfaces/adminReportedPost'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface AdminReportsParams {
  page: number
  limit: number
  status?: string
  reason?: string
  dateFrom?: string
  dateTo?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
  claimedByMe?: boolean
  postId?: number
}

export interface AdminReportedPostsParams {
  page: number
  limit: number
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export interface AdminReportedPostsPaginatedResponse {
  items: AdminReportedPost[]
  total: number
  page: number
  limit: number
}

export interface AdminReportsPaginatedResponse {
  items: AdminReport[]
  total: number
  page: number
  limit: number
}

export const getAdminReportsPaginated = async (params: AdminReportsParams): Promise<AdminReportsPaginatedResponse> => {
  const token = getCookie('token')
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.status)    query.set('status', params.status)
  if (params.reason)    query.set('reason', params.reason)
  if (params.dateFrom)  query.set('dateFrom', params.dateFrom)
  if (params.dateTo)    query.set('dateTo', params.dateTo)
  if (params.sortField) query.set('sortField', params.sortField)
  if (params.sortDir)    query.set('sortDir', params.sortDir.toUpperCase())
  if (params.claimedByMe) query.set('claimedByMe', 'true')
  if (params.postId != null) query.set('postId', String(params.postId))
  const res = await fetch(`${API_URL}/api/admin/reports?${query.toString()}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des reports')
  return res.json()
}

export const getAdminReportedPosts = async (params: AdminReportedPostsParams): Promise<AdminReportedPostsPaginatedResponse> => {
  const token = getCookie('token')
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.sortField) query.set('sortField', params.sortField)
  if (params.sortDir)   query.set('sortDir', params.sortDir.toUpperCase())
  const res = await fetch(`${API_URL}/api/admin/reports/posts?${query.toString()}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des posts signalés')
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
