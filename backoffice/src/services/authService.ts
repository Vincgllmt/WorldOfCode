import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import type {
  LoginCredentials,
  AuthenticatedUser,
  AuthenticateResponse,
  TokenResponse,
  Verify2FAPayload,
} from '@/interfaces/Authentification'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const login = async (credentials: LoginCredentials): Promise<AuthenticateResponse> => {
  const res = await fetch(`${API_URL}/api/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  })

  if (!res.ok) throw new Error('Identifiants invalides')

  return res.json() as Promise<AuthenticateResponse>
}

export const verify2FA = async (payload: Verify2FAPayload): Promise<AuthenticatedUser> => {
  const res = await fetch(`${API_URL}/api/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error('Code invalide ou expiré')

  const { token }: TokenResponse = await res.json()
  setCookie('admin_token', token, { path: '/' })

  return await getMe()
}

export const getMe = async (): Promise<AuthenticatedUser> => {
  const token = getCookie('admin_token') as string | undefined
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
  deleteCookie('admin_token', { path: '/' })
}
