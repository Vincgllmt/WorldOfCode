import { AuthenticatedUser, RegisterCredentials } from "@/interfaces/Authentification"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const register = async (credentials: RegisterCredentials): Promise<AuthenticatedUser> => {
    const res = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
    })

    let data: any = null
    try {
        data = await res.json()
    } catch {

    }

    if (!res.ok) {
        const errorMessage =
            data?.error || data?.message || 'Erreur lors de la création du compte'
        throw new Error(errorMessage)
    }

    return data

}

