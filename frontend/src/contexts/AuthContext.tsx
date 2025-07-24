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
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedToken = getCookie('token')
    if (storedToken) {
      setToken(storedToken as string)
      authService
        .getMe(storedToken as string)
        .then(setUser)
        .catch(() => {
          setUser(null)
          setToken(null)
        })
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    const interval = setInterval(() => {
      const storedToken = getCookie('token')
      if (!storedToken) logout()
    }, 50000)
    return () => clearInterval(interval)
  }, [user])

const login = async (credentials: LoginCredentials) => {
  try {
    const authenticatedUser = await authService.login(credentials)
    const storedToken = getCookie('token')
    console.log('[DEBUG LOGIN before setUser]', authenticatedUser)

    setUser(authenticatedUser)
    setToken(storedToken as string)
    console.log('[DEBUG LOGIN]', authenticatedUser)

    toast.success('Connexion réussie ✅')

    if (authenticatedUser.role === 'ROLE_ADMIN') {
      router.push('/admindashboard')
    } else {
      router.push('/home')
    }
  } catch (error) {
    toast.error('Échec de la connexion ❌')
    console.error(error)
  }
}

  const logout = () => {
    authService.logout()
    setUser(null)
    setToken(null)
    deleteCookie('token')
    toast.success('Déconnexion réussie 👋')
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
