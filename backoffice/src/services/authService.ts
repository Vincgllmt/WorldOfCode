import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import type {
  LoginCredentials,
  AuthenticatedUser,
  TokenResponse,
  TwoFAResponse,
  Verify2FAPayload,
} from '@/interfaces/Authentification'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const login = async (credentials: LoginCredentials): Promise<TwoFAResponse> => {
  const res = await fetch(`${API_URL}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!res.ok) throw new Error('Identifiants invalides')

  return res.json() as Promise<TwoFAResponse>
}

export const verify2FA = async (payload: Verify2FAPayload): Promise<AuthenticatedUser> => {
  const res = await fetch(`${API_URL}/2fa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error('Code invalide ou expiré')

  const { token }: TokenResponse = await res.json()
  setCookie('token', token, { path: '/' })

  return await getMe()
}

export const getMe = async (): Promise<AuthenticatedUser> => {
  const token = getCookie('token') as string | undefined
  if (!token) throw new Error('Token manquant')

  const res = await fetch(`${API_URL}/me`, {
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
