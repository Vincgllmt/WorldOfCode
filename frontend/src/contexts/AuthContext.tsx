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
      const authenticatedUser = await authService.login(credentials)
      setUser(authenticatedUser)
      toast.success('Connexion réussie ✅')
      router.push('/home')
    } catch (error) {
      toast.error('Échec de la connexion ❌')
      console.error(error)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    toast.success('Déconnexion réussie 👋')
    router.push('/login')
  }

  const setUserTheme = (theme: string) => {
    if (user) {
      setUser({ ...user, theme })
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        setUserTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
