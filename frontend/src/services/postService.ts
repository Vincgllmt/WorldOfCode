import { getCookie } from 'cookies-next'
import { CreatePostPayload, Liker, Post, SharePostPayload, UpdatePostPayload } from '@/interfaces/post'
import type { FetchPostsPaginatedParams, PaginatedPostsResponse } from '@/interfaces/postPagination'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

type RawLiker = {
  id?: number | string | null
  userId?: number | string | null
  user_id?: number | string | null
  user?: {
    id?: number | string | null
    username?: string | null
    avatarUrl?: string | null
    avatar?: string | null
    email?: string | null
    name?: string | null
  } | null
  username?: string | null
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
  avatar?: string | null
}

export const createPost = async (data: CreatePostPayload): Promise<Post> => {
  const token = getCookie('token')

  const res = await fetch(`${API_URL}/post`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) throw new Error('Erreur lors de la création du post')

  return res.json()
}

type PostsListResponse = Post[] | { items?: Post[] }

type RawPaginatedPostsResponse = {
  readonly items?: Post[]
  readonly page?: number
  readonly totalPages?: number
  readonly totalItems?: number
  readonly limit?: number
}

export const getAllPosts = async (): Promise<Post[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Impossible de récupérer les posts')

  const data: PostsListResponse = await res.json()
  console.log('Posts reçus :', data)
  if (Array.isArray(data)) {
    return data
  }
  return data.items ?? []
}

export const getPostsPaginated = async (
  { page, limit }: FetchPostsPaginatedParams
): Promise<PaginatedPostsResponse> => {
  const token = getCookie('token')
  const url = new URL(`${API_URL}/post`)
  url.searchParams.set('page', String(page))
  url.searchParams.set('limit', String(limit))

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Impossible de récupérer les posts paginés')

  const raw: RawPaginatedPostsResponse | Post[] = await res.json()
  const data: RawPaginatedPostsResponse = Array.isArray(raw) ? { items: raw } : raw
  const safeLimit = limit > 0 ? limit : 1
  const totalItems = data.totalItems ?? data.items?.length ?? 0
  const totalPages = data.totalPages ?? (totalItems === 0 ? 0 : Math.ceil(totalItems / safeLimit))

  return {
    items: data.items ?? [],
    page: data.page ?? page,
    totalPages,
    totalItems,
    limit: data.limit ?? safeLimit,
  }
}

export const getPostsByUserId = async (userId: number): Promise<Post[]> => {
  // IMPORTANT: ne pas charger tous les posts (trop coûteux en prod).
  // En attendant un endpoint dédié côté API, on “parcourt” la pagination globale
  // et on filtre côté client, avec des bornes pour éviter un scan infini.

  const PAGE_SIZE = 50
  const MAX_PAGES = 20 // 20 * 50 = 1000 posts max scannés

  const collected: Post[] = []
  let page = 1
  let totalPages = Infinity

  while (page <= MAX_PAGES && page <= totalPages) {
    const res = await getPostsPaginated({ page, limit: PAGE_SIZE })
    totalPages = res.totalPages

    for (const post of res.items) {
      if (post.authorId === userId) collected.push(post)
    }

    // Si l'API ne renvoie pas totalPages (ou renvoie 0), on s'arrête dès que la page est “courte”.
    if (!Number.isFinite(totalPages) || totalPages <= 0) {
      if (res.items.length < PAGE_SIZE) break
    }

    page += 1
  }

  return collected
}


export const getPostById = async (id: string): Promise<Post> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Impossible de récupérer le post')

  return res.json()
}
export const getPostsByGroupId = async (groupId: number): Promise<Post[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/group/${groupId}/posts`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Erreur lors de la récupération des posts du groupe')
  return res.json()
}

export const updatePost = async (id: number,
  data: UpdatePostPayload): Promise<Post> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error("Erreur lors de la modification du post")
  return res.json()
}


export async function deletePost(id: number): Promise<void> {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Erreur lors de la suppression du post')
}

export const likePost = async (postId: number): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post/${postId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur lors du like du post')
}

export const unlikePost = async (postId: number): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post/${postId}/like`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur lors du retrait du like')
}

export const getLikers = async (postId: number): Promise<Liker[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post/${postId}/likes`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Impossible de récupérer les likers')

  const raw = await res.json()
  const normalize = (u: RawLiker): Liker => ({
    id: Number(u?.id ?? u?.userId ?? u?.user_id ?? u?.user?.id),
    username: String(u?.username ?? u?.user?.username ?? u?.name ?? u?.email ?? 'Utilisateur'),
    avatarUrl: u?.avatarUrl ?? u?.avatar ?? null,
  })
  return Array.isArray(raw) ? raw.map(normalize).filter(l => Number.isFinite(l.id)) : []
}

export const sharePost = async ({
  postId,
  payload,
}: {
  readonly postId: number
  readonly payload: SharePostPayload
}): Promise<Post> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/post/${postId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Erreur lors du partage du post')

  return res.json()
}

export const reportPost = async (postId: number, reason?: string): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/report/post/${postId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: reason ? JSON.stringify({ reason }) : undefined
  })
  if (!res.ok) throw new Error('Erreur lors du signalement du post')
}
