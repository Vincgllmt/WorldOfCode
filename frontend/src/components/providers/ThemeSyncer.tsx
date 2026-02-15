'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

const PUBLIC_ROUTES = ['/', '/login', '/register', '/forgot-password', '/reset-password']

/**
 * Synchronise le thème next-themes avec la préférence utilisateur stockée en BDD.
 * Force le thème "light" sur les pages publiques (landing, login, register, etc.)
 * pour qu'elles gardent toujours leur apparence originale.
 */
export function ThemeSyncer() {
    const { user } = useAuth()
    const { setTheme } = useTheme()
    const pathname = usePathname()

    useEffect(() => {
        const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

        if (isPublicRoute) {
            setTheme('light')
        } else if (user?.theme) {
            setTheme(user.theme)
        }
    }, [user?.theme, pathname, setTheme])

    return null
}
