import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { LoginCredentials, AuthenticatedUser, TokenResponse } from '@/interfaces/Authentification'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

/**
 * Authentifie un utilisateur et enregistre le token dans un cookie
 */
export const login = async (credentials: LoginCredentials): Promise<AuthenticatedUser> => {
    const res = await fetch(`${API_URL}/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })

    if (!res.ok) throw new Error('Identifiants invalides')

    // le backend renvoie { token: "eyJ0..." }
    const { token }: TokenResponse = await res.json()

    // ✅ on stocke le token dans un cookie pour les requêtes futures
    setCookie('token', token, { path: '/', maxAge: 3600 })

    // ✅ on récupère maintenant les infos utilisateur
    const meRes = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!meRes.ok) throw new Error('Impossible de récupérer le profil utilisateur')

    const userData = await meRes.json()

    // ✅ on renvoie le profil complet avec le token inclus
    return {
        ...userData,
        token,
    }
}

/**
 * Retourne l'utilisateur connecté via le cookie JWT
 */
export const getMe = async (): Promise<AuthenticatedUser> => {
    const token = getCookie('token')
    if (!token) throw new Error('Aucun token trouvé')

    const res = await fetchWithAuth('/me')

    if (!res.ok) throw new Error('Token invalide')

    const userData = await res.json()
    return {
        ...userData,
        token: token as string,
    }
}

/**
 * Déconnecte l'utilisateur et supprime le token
 */
export const logout = () => {
    deleteCookie('token')
}


export const requestPasswordReset = async (email: string): Promise<void> => {
    const res = await fetch(`${API_URL}/reset-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    })

    if (!res.ok) {
        throw new Error('Erreur lors de la demande de réinitialisation.')
    }
}


export const resetPassword = async (token: string, password: string): Promise<void> => {
    const res = await fetch(`${API_URL}/reset-password/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
    })

    if (!res.ok) {
        let message = 'Échec de la réinitialisation du mot de passe.'
        try {
            const data = await res.json()
            if (data?.error) message = data.error
        } catch {

        }
        throw new Error(message)
    }
}
