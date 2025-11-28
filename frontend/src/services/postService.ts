import { getCookie } from 'cookies-next'
import { CreatePostPayload, Liker, Post, UpdatePostPayload } from '@/interfaces/post'
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
  console.log('Token utilisé pour le POST :', token)
  console.log('Creating post with data:', data)

  const res = await fetch(`${API_URL}/api/post`, {
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
  const res = await fetch(`${API_URL}/api/post`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` }
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
  const url = new URL(`${API_URL}/api/post`)
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
  const posts = await getAllPosts()
  // TODO: remplacer par un appel GET `${API_URL}/api/post/user/${userId}` quand disponible
  return posts.filter((post) => post.authorId === userId)
}

export const getPostById = async (id  : string): Promise<Post> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/post/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` }
  })

  if (!res.ok) throw new Error('Impossible de récupérer le post')

  return res.json()
}
export const getPostsByGroupId = async (groupId: number): Promise<Post[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/group/${groupId}/posts`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })

  if (!res.ok) throw new Error('Erreur lors de la récupération des posts du groupe')
  return res.json()
}

export const updatePost = async (  id: number,
  data: UpdatePostPayload): Promise<Post> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/post/${id}`, {
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
  const res = await fetch(`${API_URL}/api/post/${id}`, {
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
  const res = await fetch(`${API_URL}/api/post/${postId}/like`, {
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
  const res = await fetch(`${API_URL}/api/post/${postId}/like`, {
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
  const res = await fetch(`${API_URL}/api/post/${postId}/likes`, {
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

export const sharePost = async (postId: number): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/post/${postId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur lors du partage du post')
}

export const reportPost = async (postId: number, reason?: string): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/report/post/${postId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: reason ? JSON.stringify({ reason }) : undefined
  })
  if (!res.ok) throw new Error('Erreur lors du signalement du post')
}
