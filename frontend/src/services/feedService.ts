import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { Post } from '@/interfaces/post'
import type { TechWatchItem } from '@/interfaces/techWatch'

export interface FeedItem {
  type: 'post' | 'rss_item'
  post?: Post | null
  rssItem?: TechWatchItem | null
}

export interface FeedResponse {
  items: FeedItem[]
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

export async function getFeed(page = 1, limit = 10): Promise<FeedResponse> {
  const res = await fetchWithAuth(`/feed?page=${page}&limit=${limit}`)
  if (!res.ok) throw new Error('Erreur lors du chargement du feed')
  return res.json()
}
