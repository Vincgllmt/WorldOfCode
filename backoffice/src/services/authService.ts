import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import type { LoginCredentials, AuthenticatedUser, TokenResponse } from '@/interfaces/Authentification'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const login = async (credentials: LoginCredentials): Promise<AuthenticatedUser> => {
  const res = await fetch(`${API_URL}/api/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!res.ok) throw new Error('Identifiants invalides')

  const { token }: TokenResponse = await res.json()
  setCookie('token', token, { path: '/' })

  return await getMe()
}

export const getMe = async (): Promise<AuthenticatedUser> => {
  const token = getCookie('token') as string | undefined
  if (!token) throw new Error('Token manquant')

  const res = await fetch(`${API_URL}/api/me`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Impossible de récupérer le profil utilisateur')
  return res.json()
}

export const logout = () => {
  deleteCookie('token', { path: '/' })
}
