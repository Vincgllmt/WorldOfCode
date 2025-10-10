// import { setCookie, getCookie, deleteCookie } from 'cookies-next'
// import type { LoginCredentials, AuthenticatedUser, TokenResponse } from '@/interfaces/Authentification'

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

// /**
//  * Authentifie un utilisateur et enregistre le token dans un cookie
//  */
// export const login = async (credentials: LoginCredentials): Promise<AuthenticatedUser> => {
//     const res = await fetch(`${API_URL}/api/authenticate`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify(credentials),
//     })

//     if (!res.ok) throw new Error('Identifiants invalides')

//     const { token }: TokenResponse = await res.json()
//     setCookie('token', token, { path: '/' }) // ✅ Token stocké uniquement ici

//     return await getMe()
// }

// /**
//  * Récupère l’utilisateur courant à partir du token en cookie
//  */
// export const getMe = async (): Promise<AuthenticatedUser> => {
//     const token = getCookie('token') as string | undefined
//     if (!token) throw new Error('Token manquant')

//     const res = await fetch(`${API_URL}/api/me`, {
//         headers: { Authorization: `Bearer ${token}` },
//         cache: 'no-store',
//     })

//     if (!res.ok) throw new Error('Impossible de récupérer le profil utilisateur')

//     return res.json()
// }

// /**
//  * Déconnecte l’utilisateur en supprimant le cookie
//  */
// export const logout = () => {
//     deleteCookie('token', { path: '/' })
// }
import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import type { LoginCredentials, AuthenticatedUser, TokenResponse } from '@/interfaces/Authentification'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

/**
 * Authentifie un utilisateur et enregistre le token dans un cookie
 */
export const login = async (credentials: LoginCredentials): Promise<AuthenticatedUser> => {
    const res = await fetch(`${API_URL}/api/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })

    if (!res.ok) throw new Error('Identifiants invalides')

    // le backend renvoie { token: "eyJ0..." }
    const { token }: TokenResponse = await res.json()

    // ✅ on stocke le token dans un cookie pour les requêtes futures
    setCookie('token', token, { path: '/' })

    // ✅ on récupère maintenant les infos utilisateur
    const meRes = await fetch(`${API_URL}/api/me`, {
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

    const res = await fetch(`${API_URL}/api/me`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throw new Error('Token invalide')

    const userData = await res.json()
    return {
        ...userData,
        token: token as string, // ✅ on le renvoie aussi ici
    }
}

/**
 * Déconnecte l'utilisateur et supprime le token
 */
export const logout = () => {
    deleteCookie('token')
}
