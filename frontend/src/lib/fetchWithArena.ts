import { getCookie, deleteCookie } from 'cookies-next'

const ARENA_URL = process.env.NEXT_PUBLIC_ARENA_URL || 'http://localhost:8082'

export async function fetchWithArena(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getCookie('token')

  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${ARENA_URL}${endpoint}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    deleteCookie('token')
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    throw new Error('Session expirée')
  }

  return res
}
