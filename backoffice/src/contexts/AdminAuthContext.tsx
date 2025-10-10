'use client'

import { createContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getCookie, deleteCookie } from 'cookies-next'
import toast from 'react-hot-toast'
import { AdminAuthContextType } from '@/interfaces/AdminAuthContext'
import { AuthenticatedUser, LoginCredentials } from '@/interfaces/Authentification'
import * as authService from '@/services/authService'

export const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export const AdminAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const token = getCookie('token')
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
      const authenticatedUser = await authService.login(credentials)

      if (authenticatedUser.role !== 'ROLE_ADMIN') {
        toast.error('Vous n’avez pas accès à l’interface admin')
        return router.push('/unauthorized')
      }

      setUser(authenticatedUser)
      toast.success('Connexion admin réussie ✅')
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
    <AdminAuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}
