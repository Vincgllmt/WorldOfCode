import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type {
    LoginCredentials,
    AuthenticatedUser,
    TokenResponse,
    TwoFactorRequiredResponse,
    LoginResponse,
} from '@/interfaces/Authentification'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

/**
 * Étape 1 : soumet les credentials, retourne soit un token 2FA temporaire, soit un JWT direct
 */
export const login = async (credentials: LoginCredentials): Promise<LoginResponse> => {
    const res = await fetch(`${API_URL}/authenticate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Identifiants invalides')
    }

    return await res.json()
}

/**
 * Vérifie si la réponse du login nécessite une vérification 2FA
 */
export const isTwoFactorRequired = (response: LoginResponse): response is TwoFactorRequiredResponse => {
    return 'requires2FA' in response && response.requires2FA === true
}

/**
 * Étape 2 : vérifie le code 2FA et retourne le JWT final + user data
 */
export const verify2FA = async (tempToken: string, code: string): Promise<AuthenticatedUser> => {
    const res = await fetch(`${API_URL}/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, code }),
    })

    if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Code invalide ou expiré')
    }

    const { token }: TokenResponse = await res.json()

    // Stocker le vrai JWT
    setCookie('token', token, { path: '/', maxAge: 3600 })

    // Récupérer le profil utilisateur
    const meRes = await fetch(`${API_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!meRes.ok) throw new Error('Impossible de récupérer le profil utilisateur')

    const userData = await meRes.json()
    return { ...userData, token }
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
