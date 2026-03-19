'use client'

import { createContext, useState, useEffect, ReactNode } from 'react'
import { getCookie } from 'cookies-next'
import { useRouter } from 'next/navigation'
import * as authService from '@/services/authService'
import { AuthContextType } from '@/interfaces/AuthContext'
import { AuthenticatedUser, LoginCredentials } from '@/interfaces/Authentification'
import toast from 'react-hot-toast'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // vérifier s'il existe déjà un token
  useEffect(() => {
    const storedToken = getCookie('token')
    if (storedToken) {
      authService
        .getMe()
        .then(setUser)
        .catch(() => logout()) // si token invalide → logout
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      const result = await authService.login(credentials)

      if (authService.isTwoFactorRequired(result)) {
        sessionStorage.setItem('2fa_tempToken', result.tempToken)
        sessionStorage.setItem('2fa_maskedEmail', result.maskedEmail)
        router.push('/2fa')
        return
      }

      // Fallback si 2FA désactivé (ne devrait pas arriver, mais sécurité)
      const { token } = result
      const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (meRes.ok) {
        const userData = await meRes.json()
        setUser({ ...userData, token })
        router.push('/home')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Identifiants invalides'
      toast.error(message)
      throw error
    }
  }

  const loginSilent = async (credentials: LoginCredentials): Promise<AuthenticatedUser> => {
    const result = await authService.login(credentials)

    if (authService.isTwoFactorRequired(result)) {
      sessionStorage.setItem('2fa_tempToken', result.tempToken)
      sessionStorage.setItem('2fa_maskedEmail', result.maskedEmail)
      router.push('/2fa')
      throw new Error('2FA required')
    }

    const { token } = result
    const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const userData = await meRes.json()
    const authenticatedUser = { ...userData, token }
    setUser(authenticatedUser)
    return authenticatedUser
  }

  const verify2FA = async (code: string) => {
    const tempToken = sessionStorage.getItem('2fa_tempToken')
    if (!tempToken) {
      throw new Error('Aucun token temporaire trouvé. Veuillez vous reconnecter.')
    }

    const authenticatedUser = await authService.verify2FA(tempToken, code)
    sessionStorage.removeItem('2fa_tempToken')
    setUser(authenticatedUser)

    // Rediriger vers onboarding si inscription, sinon home
    const redirect = sessionStorage.getItem('2fa_redirect') || '/home'
    sessionStorage.removeItem('2fa_redirect')
    router.push(redirect)
  }

  const logout = () => {
    authService.logout()
    sessionStorage.removeItem('2fa_tempToken')
    setUser(null)
    router.push('/login')
  }

  const setUserTheme = (theme: string) => {
    if (user) {
      setUser({ ...user, theme })
    }
  }

  const setUserAvatar = (url: string | null) => {
    if (user) {
      setUser({ ...user, avatarUrl: url })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        loginSilent,
        verify2FA,
        logout,
        setUserTheme,
        setUserAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
