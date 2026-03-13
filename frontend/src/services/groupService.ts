import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { CreateGroupPayload, Group, UpdateGroupPayload } from '@/interfaces/group'

export const getGroups = async (): Promise<Group[]> => {
  const res = await fetchWithAuth('/group')

  if (!res.ok) throw new Error('Erreur lors du chargement des groupes')
  return res.json()
}

export const getGroupById = async (id: number): Promise<Group>  => {
  const res = await fetchWithAuth(`/group/${id}`)

  if (!res.ok) throw new Error('Erreur lors de la récupération du groupe')
  return res.json()
}

export const createGroup = async (data: CreateGroupPayload): Promise<Group> => {
  const res = await fetchWithAuth('/group', {
    method: 'POST',
    body: JSON.stringify(data)
  })

  if (!res.ok) throw new Error('Erreur lors de la création du groupe')
  return res.json()
}

export const updateGroup = async (data: UpdateGroupPayload): Promise<Group> => {
  const res = await fetchWithAuth(`/group/${data.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name: data.name, description: data.description })
  })

  if (!res.ok) throw new Error('Erreur lors de la mise à jour du groupe')
  return res.json()
}

export const deleteGroup = async (id: number): Promise<void> => {
  const res = await fetchWithAuth(`/group/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) throw new Error('Erreur lors de la suppression du groupe')
}

export async function joinGroup(id:number): Promise<void> {
  const res = await fetchWithAuth(`/group/${id}/join`, {
    method: 'POST',
    credentials: 'include',
  })

  if (!res.ok) throw new Error('Erreur lors de la demande d\'adhésion au groupe')
}

export async function leaveGroup(id: number): Promise<void> {
  const res = await fetchWithAuth(`/group/${id}/join`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!res.ok) throw new Error('Erreur lors du départ du groupe')
}
