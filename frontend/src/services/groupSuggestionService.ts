import { fetchWithAuth } from '@/lib/fetchWithAuth'

export interface GroupSuggestionRequest {
  name: string
  description?: string
  rssFeedUrl?: string
}

export const postGroupSuggestion = async (data: GroupSuggestionRequest): Promise<void> => {
  const payload: GroupSuggestionRequest = { name: data.name }
  if (data.description && data.description.trim() !== '') {
    payload.description = data.description.trim()
  }
  if (data.rssFeedUrl && data.rssFeedUrl.trim() !== '') {
    payload.rssFeedUrl = data.rssFeedUrl.trim()
  }

  const res = await fetchWithAuth('/api/group-suggestions', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error ?? 'Erreur lors de la soumission de la suggestion.')
  }
}
