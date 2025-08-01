
import { getCookie } from 'cookies-next'
import { User, UpdateUserPayload, ChangePasswordPayload } from '@/interfaces/user'
import { Group } from '@/interfaces/group'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const getAllUsers = async (): Promise<User[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/user`, {
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
  const res = await fetch(`${API_URL}/api/user/${data.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour')
  return res.json()
}

export const deleteUser = async (id: number): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/user/${id}`, {
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
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/${userId}/groups`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Erreur lors de la récupération des groupes utilisateur')
  }

  return res.json()
}

export async function getUserById(userId: number): Promise<User> {
  const token = getCookie('token')
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/user/${userId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Erreur lors de la récupération de l’utilisateur')
  }

  return res.json()
}

export const changeUserPassword = async ({id, currentPassword, newPassword,}: ChangePasswordPayload): Promise<{ message: string }> => {
  const token = getCookie('token')

  const res = await fetch(`${API_URL}/api/user/${id}/password`, {
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
