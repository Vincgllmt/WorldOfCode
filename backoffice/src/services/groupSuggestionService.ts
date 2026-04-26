import { getCookie } from 'cookies-next'
import { GroupSuggestion, ApproveSuggestionPayload, RejectSuggestionPayload } from '@/interfaces/groupSuggestion'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export interface GroupSuggestionsParams {
  page: number
  limit: number
  status?: string
  sortField?: string
  sortDir?: 'asc' | 'desc'
}

export interface GroupSuggestionsPaginatedResponse {
  items: GroupSuggestion[]
  total: number
  page: number
  limit: number
}

export const getGroupSuggestionsPaginated = async (params: GroupSuggestionsParams): Promise<GroupSuggestionsPaginatedResponse> => {
  const token = getCookie('token')
  const query = new URLSearchParams()
  query.set('page', String(params.page))
  query.set('limit', String(params.limit))
  if (params.status)    query.set('status', params.status)
  if (params.sortField) query.set('sortField', params.sortField)
  if (params.sortDir)   query.set('sortDir', params.sortDir.toUpperCase())
  const res = await fetch(`${API_URL}/api/admin/group-suggestions?${query.toString()}`, {
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des suggestions')
  return res.json()
}

export const claimGroupSuggestion = async (id: number): Promise<GroupSuggestion> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/group-suggestions/${id}/claim`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? 'Impossible de prendre en charge cette suggestion.')
  }
  return res.json()
}

export const approveGroupSuggestion = async (
  id: number,
  payload: ApproveSuggestionPayload
): Promise<GroupSuggestion> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/group-suggestions/${id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? "Impossible d'approuver cette suggestion.")
  }
  return res.json()
}

export const rejectGroupSuggestion = async (
  id: number,
  payload: RejectSuggestionPayload
): Promise<GroupSuggestion> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/group-suggestions/${id}/reject`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? 'Impossible de rejeter cette suggestion.')
  }
  return res.json()
}
