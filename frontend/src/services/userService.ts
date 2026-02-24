
import { getCookie } from 'cookies-next'
import { User, UpdateUserPayload, ChangePasswordPayload, PublicUser, UpdateProfilePayload, Skill, UserLink, CreateLinkPayload } from '@/interfaces/user'
import { Group } from '@/interfaces/group'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const getAllUsers = async (): Promise<User[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/user`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des utilisateurs')
  return res.json()
}

export const updateUser = async (data: UpdateUserPayload): Promise<User> => {
  const token = getCookie('token')
  const { id, ...payload } = data
  const res = await fetch(`${API_URL}/user/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    credentials: 'include',
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour')
  return res.json()
}

export const deleteUser = async (id: number): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/user/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur lors de la suppression')
}

export async function getUserGroups(userId: number): Promise<Group[]> {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/user/${userId}/groups`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Erreur lors de la récupération des groupes utilisateur')
  }

  const data = (await res.json()) as Group[]
  return data
}

export async function getUserById(userId: number): Promise<PublicUser> {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/user/${userId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Erreur lors de la récupération de l’utilisateur')
  }

  const user = (await res.json()) as PublicUser
  return user
}

export const updateUserTheme = async (userId: number, theme: string): Promise<User> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/user/${userId}/theme`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ theme }),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du thème')
  return res.json()
}

export const changeUserPassword = async ({id, currentPassword, newPassword,}: ChangePasswordPayload): Promise<{ message: string }> => {
  const token = getCookie('token')

  const res = await fetch(`${API_URL}/user/${id}/password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || 'Erreur lors du changement de mot de passe')
  }

  return res.json()
}

export const updateUserProfile = async (userId: number, data: UpdateProfilePayload): Promise<User> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/user/${userId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du profil')
  return res.json()
}

export const updateUserSkills = async (userId: number, skillIds: number[]): Promise<Skill[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/user/${userId}/skills`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ skillIds }),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour des compétences')
  return res.json()
}

export const createUserLink = async (userId: number, data: CreateLinkPayload): Promise<UserLink> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/user/${userId}/links`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur lors de la création du lien')
  return res.json()
}
