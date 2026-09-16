import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { User, UpdateUserPayload, ChangePasswordPayload, PublicUser, UpdateProfilePayload, Skill, UserLink, CreateLinkPayload } from '@/interfaces/user'
import { Group } from '@/interfaces/group'

export const getAllUsers = async (): Promise<User[]> => {
  const res = await fetchWithAuth('/user')
  if (!res.ok) throw new Error('Erreur lors du chargement des utilisateurs')
  return res.json()
}

export const updateUser = async (data: UpdateUserPayload): Promise<User> => {
  const { id, ...payload } = data
  const res = await fetchWithAuth(`/user/${id}`, {
    method: 'PUT',
    credentials: 'include',
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour')
  return res.json()
}

export const deleteUser = async (id: number): Promise<void> => {
  const res = await fetchWithAuth(`/user/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Erreur lors de la suppression')
}

export async function getUserGroups(userId: number): Promise<Group[]> {
  const res = await fetchWithAuth(`/user/${userId}/groups`, {
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Erreur lors de la récupération des groupes utilisateur')
  }

  const data = (await res.json()) as Group[]
  return data
}

export async function getUserById(userId: number): Promise<PublicUser> {
  const res = await fetchWithAuth(`/user/${userId}`, {
    credentials: 'include',
  })

  if (!res.ok) {
    throw new Error('Erreur lors de la récupération de l\'utilisateur')
  }

  const user = (await res.json()) as PublicUser
  return user
}

export const updateUserTheme = async (userId: number, theme: string): Promise<User> => {
  const res = await fetchWithAuth(`/user/${userId}/theme`, {
    method: 'PUT',
    body: JSON.stringify({ theme }),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du thème')
  return res.json()
}

export const changeUserPassword = async ({id, currentPassword, newPassword,}: ChangePasswordPayload): Promise<{ message: string }> => {
  const res = await fetchWithAuth(`/user/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  })

  if (!res.ok) {
    const error = await res.json()
    throw new Error(error?.error || 'Erreur lors du changement de mot de passe')
  }

  return res.json()
}

export const updateUserProfile = async (userId: number, data: UpdateProfilePayload): Promise<User> => {
  const res = await fetchWithAuth(`/user/${userId}/profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du profil')
  return res.json()
}

export const updateUserSkills = async (userId: number, skillIds: number[]): Promise<Skill[]> => {
  const res = await fetchWithAuth(`/user/${userId}/skills`, {
    method: 'PUT',
    body: JSON.stringify({ skillIds }),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour des compétences')
  return res.json()
}

export const createUserLink = async (userId: number, data: CreateLinkPayload): Promise<UserLink> => {
  const res = await fetchWithAuth(`/user/${userId}/links`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur lors de la création du lien')
  return res.json()
}

export const updateUserLink = async (userId: number, linkId: number, data: CreateLinkPayload): Promise<UserLink> => {
  const res = await fetchWithAuth(`/user/${userId}/links/${linkId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour du lien')
  return res.json()
}

export const deleteUserLink = async (userId: number, linkId: number): Promise<void> => {
  const res = await fetchWithAuth(`/user/${userId}/links/${linkId}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Erreur lors de la suppression du lien')
}
