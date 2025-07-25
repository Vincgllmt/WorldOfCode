'use client'

import { createContext, useState, useEffect, ReactNode } from 'react'
import { getCookie, deleteCookie } from 'cookies-next'
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

  useEffect(() => {
    const storedToken = getCookie('token')
    if (storedToken) {
      authService
        .getMe(storedToken as string)
        .then(setUser)
        .catch(() => {
          logout()
        })
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
      router.push('/')
    } catch (error) {
      toast.error('Échec de la connexion ❌')
      console.error(error)
    }
  }

  const logout = () => {
    authService.logout()
    setUser(null)
    deleteCookie('token')
    toast.success('Déconnexion réussie 👋')
    router.push('/login')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
