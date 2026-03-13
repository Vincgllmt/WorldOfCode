import { getCookie, deleteCookie } from 'cookies-next'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

/**
 * Wrapper fetch qui :
 * 1. Ajoute automatiquement le token JWT depuis le cookie
 * 2. Redirige vers /login si le token est expiré (401)
 */
export async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getCookie('token')

  const headers: HeadersInit = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
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
