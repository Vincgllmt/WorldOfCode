
import { getCookie } from 'cookies-next'
import { CreateGroupPayload, Group, UpdateGroupPayload } from '@/interfaces/group'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const getGroups = async (): Promise<Group[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/group`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Erreur lors du chargement des groupes')
  return res.json()
}

export const getGroupById = async (id: number): Promise<Group>  => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/group/${id}`, {
    headers: {
      'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`
    },
  })

  if (!res.ok) throw new Error('Erreur lors de la récupération du groupe')
  return res.json()
}

export const createGroup = async (data: CreateGroupPayload): Promise<Group> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/group`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) throw new Error('Erreur lors de la création du groupe')
  return res.json()
}

export const updateGroup = async (data: UpdateGroupPayload): Promise<Group> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/group/${data.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name: data.name, description: data.description })
  })

  if (!res.ok) throw new Error('Erreur lors de la mise à jour du groupe')
  return res.json()
}

export const deleteGroup = async (id: number): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/group/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Erreur lors de la suppression du groupe')
}

export async function joinGroup(id:number): Promise<void> {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/group/${id}/join`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Erreur lors de la demande d\'adhésion au groupe')
}
