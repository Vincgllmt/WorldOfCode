// frontend/src/services/postService.ts
import { getCookie } from 'cookies-next'
import { CreatePostPayload, Liker, Post, UpdatePostPayload } from '@/interfaces/post'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

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

export const getAllPosts = async (): Promise<Post[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/post`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` }
  })

  if (!res.ok) throw new Error('Impossible de récupérer les posts')

  const data = await res.json()
  console.log('Posts reçus :', data)
  return data
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
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Impossible de récupérer les likers')
  return res.json()
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
