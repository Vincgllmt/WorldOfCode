import { getCookie } from 'cookies-next'
import type { SearchParams, SearchResponse, UserPreview, GroupPreview } from '@/interfaces/search'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export async function search({ q, limit = 5 }: SearchParams): Promise<SearchResponse> {
  const query = q.trim()
  if (!query) return { users: [], groups: [] }

  const token = getCookie('token')
  const url = `${API_URL}/search?q=${encodeURIComponent(query)}&limit=${limit}`

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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
