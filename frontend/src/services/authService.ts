import { setCookie, getCookie, deleteCookie } from 'cookies-next'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { parseAuthErrorResponse, parseNetworkError } from '@/lib/authErrors'
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
    let res: Response
    try {
        res = await fetch(`${API_URL}/authenticate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(credentials),
        })
    } catch (err) {
        throw new Error(parseNetworkError(err, 'Connexion au serveur impossible.'))
    }

    if (!res.ok) {
        throw new Error(await parseAuthErrorResponse(res, 'Identifiants invalides.'))
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
export const verify2FA = async (tempToken: string, code: string, rememberDevice = false): Promise<AuthenticatedUser> => {
    let res: Response
    try {
        res = await fetch(`${API_URL}/2fa/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ tempToken, code, rememberDevice }),
        })
    } catch (err) {
        throw new Error(parseNetworkError(err, 'Connexion au serveur impossible.'))
    }

    if (!res.ok) {
        throw new Error(await parseAuthErrorResponse(res, 'Code incorrect ou expiré.'))
    }

    const { token }: TokenResponse = await res.json()

    setCookie('token', token, { path: '/', maxAge: 900 })

    let meRes: Response
    try {
        meRes = await fetch(`${API_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
        })
    } catch (err) {
        throw new Error(parseNetworkError(err, 'Impossible de récupérer votre profil.'))
    }

    if (!meRes.ok) {
        throw new Error(await parseAuthErrorResponse(meRes, 'Impossible de récupérer votre profil.'))
    }

    const userData = await meRes.json()
    return { ...userData, token }
}

/**
 * Retourne l'utilisateur connecté via le cookie JWT
 */
export const getMe = async (): Promise<AuthenticatedUser> => {
    const token = getCookie('token')
    if (!token) throw new Error('Vous n’êtes pas connecté.')

    let res: Response
    try {
        res = await fetchWithAuth('/me')
    } catch (err) {
        throw new Error(parseNetworkError(err, 'Impossible de récupérer votre profil.'))
    }

    if (!res.ok) {
        throw new Error(await parseAuthErrorResponse(res, 'Session expirée. Veuillez vous reconnecter.'))
    }

    const userData = await res.json()
    return {
        ...userData,
        token: token as string,
    }
}

/**
 * Renouvelle le token JWT silencieusement (utilisateur toujours connecté)
 */
export const refreshToken = async (): Promise<string> => {
    let res: Response
    try {
        res = await fetchWithAuth('/auth/refresh', { method: 'POST' })
    } catch (err) {
        throw new Error(parseNetworkError(err, 'Impossible de renouveler la session.'))
    }
    if (!res.ok) {
        throw new Error(await parseAuthErrorResponse(res, 'La session n’a pas pu être renouvelée.'))
    }
    const { token }: TokenResponse = await res.json()
    setCookie('token', token, { path: '/', maxAge: 900 })
    return token
}

/**
 * Déconnecte l'utilisateur et supprime le token
 */
export const logout = () => {
    deleteCookie('token')
}


export const requestPasswordReset = async (email: string): Promise<void> => {
    let res: Response
    try {
        res = await fetch(`${API_URL}/reset-password/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        })
    } catch (err) {
        throw new Error(parseNetworkError(err, 'Impossible de contacter le serveur.'))
    }

    if (!res.ok) {
        throw new Error(await parseAuthErrorResponse(res, 'Erreur lors de la demande de réinitialisation.'))
    }
}


export const resetPassword = async (token: string, password: string): Promise<void> => {
    let res: Response
    try {
        res = await fetch(`${API_URL}/reset-password/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password }),
        })
    } catch (err) {
        throw new Error(parseNetworkError(err, 'Impossible de contacter le serveur.'))
    }

    if (!res.ok) {
        throw new Error(await parseAuthErrorResponse(res, 'Échec de la réinitialisation du mot de passe.'))
    }
}
