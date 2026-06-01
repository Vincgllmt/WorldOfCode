import { getCookie } from 'cookies-next'
import { AdminGroupListItem } from '@/interfaces/adminGroup'
import { AdminGroupDetail } from '@/interfaces/adminGroupDetail'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken() {
  return getCookie('admin_token') as string | undefined
}

export interface AdminGroupsParams {
  page: number
  limit: number
  search?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export interface AdminGroupsPaginatedResponse {
  items: AdminGroupListItem[]
  total: number
  page: number
  limit: number
}

export const adminGroupService = {
  getGroupsPaginated: async (params: AdminGroupsParams): Promise<AdminGroupsPaginatedResponse> => {
    const query = new URLSearchParams()
    query.set('page', String(params.page))
    query.set('limit', String(params.limit))
    if (params.search)    query.set('search', params.search)
    if (params.sortField) query.set('sortField', params.sortField)
    if (params.sortDir)   query.set('sortDir', params.sortDir.toUpperCase())

    const res = await fetch(`${API_URL}/api/admin/groups?${query.toString()}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Erreur chargement groupes')
    return res.json()
  },

  createGroup: async (data: {
    name: string
    description?: string
    rssFeedUrl?: string
  }): Promise<AdminGroupListItem> => {
    const payload: Record<string, string | null> = { name: data.name }
    if (data.description) payload.description = data.description
    if (data.rssFeedUrl) payload.rssFeedUrl = data.rssFeedUrl
    const res = await fetch(`${API_URL}/api/admin/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Création échouée')
    return res.json()
  },

  updateGroup: async (data: {
    id: number
    name: string
    description?: string
    rssFeedUrl?: string
  }): Promise<AdminGroupListItem> => {
    const payload: Record<string, string | null> = {
      name: data.name,
      description: data.description ?? null,
      rssFeedUrl: data.rssFeedUrl || null,
    }
    const res = await fetch(`${API_URL}/api/admin/groups/${data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Mise à jour échouée')
    return res.json()
  },

  getGroupDetail: async (id: number): Promise<AdminGroupDetail> => {
    const res = await fetch(`${API_URL}/api/admin/groups/${id}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Chargement détail groupe échoué')
    return res.json()
  },

  deleteGroup: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/admin/groups/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Suppression échouée')
  },
}
