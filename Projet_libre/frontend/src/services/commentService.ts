import { getCookie } from 'cookies-next'
import { Comment, CreateCommentPayload, UpdateCommentPayload } from '@/interfaces/comment'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const createComment = async (data: CreateCommentPayload): Promise<Comment> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })

  if (!res.ok) throw new Error('Erreur lors de la création du commentaire')

  return res.json()
}

export const getAllComments = async (): Promise<Comment[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/comment`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` }
  })

  if (!res.ok) throw new Error('Erreur lors du chargement des commentaires')

  return res.json()
}

export const getCommentsByPostId = async (postId: string): Promise<Comment[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/comment/post/${postId}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` }
  })

  if (!res.ok) throw new Error('Erreur lors du chargement des commentaires pour ce post')

  return res.json()
}

export const deleteComment = async (id: string): Promise<void> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/comment/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` }
  })

  if (!res.ok) throw new Error('Erreur lors de la suppression du commentaire')
}

export const updateComment = async (data: UpdateCommentPayload): Promise<Comment> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/comment/${data.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ content: data.content }) // ✅ Manquait ici
  })

  if (!res.ok) throw new Error('Erreur lors de la mise à jour du commentaire')

  return res.json()
}
