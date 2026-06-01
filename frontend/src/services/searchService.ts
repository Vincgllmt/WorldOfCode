import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { SearchParams, SearchResponse, UserPreview, GroupPreview } from '@/interfaces/search'

export async function search({ q, limit = 5 }: SearchParams): Promise<SearchResponse> {
  const query = q.trim()
  if (!query) return { users: [], groups: [], posts: [] }

  const res = await fetchWithAuth(`/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error(`Search failed: ${res.status}`)
  }

  return res.json() as Promise<SearchResponse>
}

export async function searchUsers({ q, limit = 5 }: SearchParams): Promise<UserPreview[]> {
  const result = await search({ q, limit })
  return result.users
}

export async function searchGroups({ q, limit = 5 }: SearchParams): Promise<GroupPreview[]> {
  const result = await search({ q, limit })
  return result.groups
}
