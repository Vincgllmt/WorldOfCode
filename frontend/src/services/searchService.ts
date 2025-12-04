import { getCookie } from 'cookies-next'
import { SearchGroupsParams, SearchUsersParams, UserPreview, GroupPreview } from '@/interfaces/search'
import { getAllUsers } from '@/services/userService'
import { getGroups } from '@/services/groupService'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

const normalize = (value: string): string => value.trim().toLowerCase()

const rankByQuery = <T extends { name?: string; username?: string }>(
  items: readonly T[],
  query: string,
  labelKey: 'name' | 'username'
): T[] => {
  const lowered = normalize(query)
  return items
    .filter((item) => {
      const label = item[labelKey]
      if (!label) return false
      return normalize(label).includes(lowered)
    })
    .sort((a, b) => {
      const aLabel = normalize(String(a[labelKey] ?? ''))
      const bLabel = normalize(String(b[labelKey] ?? ''))
      const aStarts = aLabel.startsWith(lowered)
      const bStarts = bLabel.startsWith(lowered)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return aLabel.localeCompare(bLabel, 'fr', { sensitivity: 'base' })
    })
}

export async function searchUsers({ q, limit = 5 }: SearchUsersParams): Promise<UserPreview[]> {
  const query = q.trim()
  if (!query) return []

  const token = getCookie('token')
  const url = `${API_URL}/api/users/search?q=${encodeURIComponent(query)}&limit=${limit}`

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })

    if (res.ok) {
      const data = (await res.json()) as UserPreview[]
      return data.slice(0, limit)
    }
  } catch {
    // ignore and fallback
  }

  // TODO: remplacer le fallback par l’endpoint de recherche dès qu’il sera disponible côté API
  const allUsers = await getAllUsers()
  const ranked = rankByQuery(allUsers, query, 'username')
  return ranked.slice(0, limit).map((user) => ({
    id: user.id,
    username: user.username,
  }))
}

export async function searchGroups({ q, limit = 5 }: SearchGroupsParams): Promise<GroupPreview[]> {
  const query = q.trim()
  if (!query) return []

  const token = getCookie('token')
  const url = `${API_URL}/api/groups/search?q=${encodeURIComponent(query)}&limit=${limit}`

  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      credentials: 'include',
    })

    if (res.ok) {
      const data = (await res.json()) as GroupPreview[]
      return data.slice(0, limit)
    }
  } catch {
    // ignore and fallback
  }

  // TODO: remplacer le fallback par l’endpoint de recherche des groupes dès qu’il sera disponible côté API
  const allGroups = await getGroups()
  const ranked = rankByQuery(allGroups, query, 'name')
  return ranked.slice(0, limit).map((group) => ({
    id: group.id,
    name: group.name,
  }))
}
