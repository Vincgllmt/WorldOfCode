import { getCookie } from 'cookies-next'
import { AdminGroupListItem } from '@/interfaces/adminGroup'

const API_URL = process.env.NEXT_PUBLIC_API_URL

function getToken() {
  return getCookie('token') as string | undefined
}

export const adminGroupService = {
  getGroups: async (): Promise<AdminGroupListItem[]> => {
    const res = await fetch(`${API_URL}/api/admin/groups`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Erreur chargement groupes')
    return res.json()
  },

  createGroup: async (data: {
    name: string
    description?: string
    rssFeedUrl?: string
  }): Promise<AdminGroupListItem> => {
    const payload: Record<string, string | null> = { name: data.name }
    if (data.description) payload.description = data.description
    if (data.rssFeedUrl) payload.rssFeedUrl = data.rssFeedUrl
    const res = await fetch(`${API_URL}/api/admin/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Création échouée')
    return res.json()
  },

  updateGroup: async (data: {
    id: number
    name: string
    description?: string
    rssFeedUrl?: string
  }): Promise<AdminGroupListItem> => {
    const payload: Record<string, string | null> = {
      name: data.name,
      description: data.description ?? null,
      rssFeedUrl: data.rssFeedUrl || null,
    }
    const res = await fetch(`${API_URL}/api/admin/groups/${data.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Mise à jour échouée')
    return res.json()
  },

  deleteGroup: async (id: number): Promise<void> => {
    const res = await fetch(`${API_URL}/api/admin/groups/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    if (!res.ok) throw new Error('Suppression échouée')
  },
}
