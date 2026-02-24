import { getCookie } from 'cookies-next'
import { SearchGroupsParams, SearchUsersParams, UserPreview, GroupPreview } from '@/interfaces/search'
import { getAllUsers } from '@/services/userService'
import { getGroups } from '@/services/groupService'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

// En production, on évite absolument les fallbacks qui téléchargent *toute* la base (users/groups)
// car cela provoque des lenteurs importantes. Le fallback peut être ré-activé localement si besoin.
const ENABLE_FALLBACK =
  process.env.NEXT_PUBLIC_SEARCH_FALLBACK === 'true' || process.env.NODE_ENV === 'development'

let cachedUsers: Awaited<ReturnType<typeof getAllUsers>> | null = null
let cachedUsersPromise: Promise<Awaited<ReturnType<typeof getAllUsers>>> | null = null

let cachedGroups: Awaited<ReturnType<typeof getGroups>> | null = null
let cachedGroupsPromise: Promise<Awaited<ReturnType<typeof getGroups>>> | null = null

async function getAllUsersCached() {
  if (cachedUsers) return cachedUsers
  if (!cachedUsersPromise) {
    cachedUsersPromise = getAllUsers().then((users) => {
      cachedUsers = users
      return users
    })
  }
  return cachedUsersPromise
}

async function getGroupsCached() {
  if (cachedGroups) return cachedGroups
  if (!cachedGroupsPromise) {
    cachedGroupsPromise = getGroups().then((groups) => {
      cachedGroups = groups
      return groups
    })
  }
  return cachedGroupsPromise
}

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
  // Convention à implémenter côté API: GET /api/user/search?q=...&limit=...
  const url = `${API_URL}/user/search?q=${encodeURIComponent(query)}&limit=${limit}`

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

  if (!ENABLE_FALLBACK) return []

  // Fallback DEV uniquement (cache mémoire => évite de retélécharger à chaque frappe)
  const allUsers = await getAllUsersCached()
  const ranked = rankByQuery(allUsers, query, 'username')
  return ranked.slice(0, limit).map((user) => ({ id: user.id, username: user.username }))
}

export async function searchGroups({ q, limit = 5 }: SearchGroupsParams): Promise<GroupPreview[]> {
  const query = q.trim()
  if (!query) return []

  const token = getCookie('token')
  // Convention à implémenter côté API: GET /api/group/search?q=...&limit=...
  const url = `${API_URL}/group/search?q=${encodeURIComponent(query)}&limit=${limit}`

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

  if (!ENABLE_FALLBACK) return []

  // Fallback DEV uniquement (cache mémoire)
  const allGroups = await getGroupsCached()
  const ranked = rankByQuery(allGroups, query, 'name')
  return ranked.slice(0, limit).map((group) => ({ id: group.id, name: group.name }))
}
