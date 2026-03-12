import { getCookie } from 'cookies-next'
import type { TechWatchItemsResponse } from '@/interfaces/techWatch'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const getTechWatchItems = async (
  groupId: number,
  page = 1,
  limit = 20
): Promise<TechWatchItemsResponse> => {
  const token = getCookie('token')
  const res = await fetch(
    `${API_URL}/group/${groupId}/tech-watch?page=${page}&limit=${limit}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!res.ok) throw new Error('Erreur lors du chargement de la veille tech')
  return res.json()
}

export const getTechWatchFeed = async (
  page = 1,
  limit = 20
): Promise<TechWatchItemsResponse> => {
  const token = getCookie('token')
  const res = await fetch(
    `${API_URL}/tech-watch/feed?page=${page}&limit=${limit}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  if (!res.ok) throw new Error('Erreur lors du chargement du fil d\'actualités')
  return res.json()
}
