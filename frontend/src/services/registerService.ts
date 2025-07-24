import { AuthenticatedUser, LoginCredentials } from "@/interfaces/Authentification"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'


export const register = async (credentials: LoginCredentials): Promise<AuthenticatedUser> => {
  const res = await fetch(`${API_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (res.status === 409) {
    throw new Error("Nom d'utilisateur déjà pris")
  }

  if (!res.ok) throw new Error('Erreur lors de création du compte')

  return await res.json()
}
