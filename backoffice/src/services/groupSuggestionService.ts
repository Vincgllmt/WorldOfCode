import { getCookie } from 'cookies-next'
import { GroupSuggestion, RejectSuggestionPayload } from '@/interfaces/groupSuggestion'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const getGroupSuggestions = async (): Promise<GroupSuggestion[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/group-suggestions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

export const approveGroupSuggestion = async (id: number): Promise<GroupSuggestion> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/admin/group-suggestions/${id}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
