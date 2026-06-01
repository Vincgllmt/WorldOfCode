'use client'

import { createContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getCookie, setCookie, deleteCookie } from 'cookies-next'
import toast from 'react-hot-toast'
import { AdminAuthContextType, TwoFAPendingState } from '@/interfaces/AdminAuthContext'
import { AuthenticatedUser, LoginCredentials } from '@/interfaces/Authentification'
import * as authService from '@/services/authService'

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [twoFAPending, setTwoFAPending] = useState<TwoFAPendingState | null>(null)
  const router = useRouter()

  useEffect(() => {
    const token = getCookie('admin_token')
    if (!token) return setIsLoading(false)

    authService.getMe()
      .then(user => {
        if (user.role !== 'ROLE_ADMIN') {
          toast.error("Accès non autorisé")
          router.push('/unauthorized')
        } else {
          setUser(user)
        }
      })
      .catch(() => logout())
      .finally(() => setIsLoading(false))
  }, [])

  const login = async (credentials: LoginCredentials) => {
    try {
      const response = await authService.login(credentials)
      if ('token' in response) {
        // Trusted device — skip 2FA, set token directly
        setCookie('admin_token', response.token, { path: '/' })
        const authenticatedUser = await authService.getMe()
        if (authenticatedUser.role !== 'ROLE_ADMIN') {
          toast.error("Vous n'avez pas accès à l'interface admin")
          return router.push('/unauthorized')
        }
        setUser(authenticatedUser)
        toast.success('Connexion admin réussie ✅')
        router.push('/')
      } else {
        setTwoFAPending({ tempToken: response.tempToken, maskedEmail: response.maskedEmail })
      }
    } catch (error) {
      toast.error('Identifiants invalides')
      console.error(error)
    }
  }

  const verify2FA = async (code: string, rememberDevice?: boolean) => {
    if (!twoFAPending) return
    try {
      const authenticatedUser = await authService.verify2FA({
        tempToken: twoFAPending.tempToken,
        code,
        rememberDevice,
      })

      if (authenticatedUser.role !== 'ROLE_ADMIN') {
        toast.error("Vous n'avez pas accès à l'interface admin")
        setTwoFAPending(null)
        return router.push('/unauthorized')
      }

      setUser(authenticatedUser)
      setTwoFAPending(null)
      toast.success('Connexion admin réussie ✅')
      router.push('/')
    } catch (error) {
      toast.error('Code invalide ou expiré ❌')
      console.error(error)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    setTwoFAPending(null)
    deleteCookie('admin_token')
    toast.success('Déconnexion réussie 👋')
    router.push('/login')
  }

  return (
    <AdminAuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, twoFAPending, login, verify2FA, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}
