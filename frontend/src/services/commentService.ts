import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { Comment, CreateCommentPayload, UpdateCommentPayload } from '@/interfaces/comment'

export const createComment = async (data: CreateCommentPayload): Promise<Comment> => {
  const res = await fetchWithAuth('/comment', {
    method: 'POST',
    body: JSON.stringify(data)
  })

  if (!res.ok) throw new Error('Erreur lors de la création du commentaire')

  return res.json()
}

export const getAllComments = async (): Promise<Comment[]> => {
  const res = await fetchWithAuth('/comment')

  if (!res.ok) throw new Error('Erreur lors du chargement des commentaires')

  return res.json()
}

export const getCommentsByPostId = async (postId: string): Promise<Comment[]> => {
  const res = await fetchWithAuth(`/comment/post/${postId}`)

  if (!res.ok) throw new Error('Erreur lors du chargement des commentaires pour ce post')

  return res.json()
}

export const deleteComment = async (id: string): Promise<void> => {
  const res = await fetchWithAuth(`/comment/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) throw new Error('Erreur lors de la suppression du commentaire')
}

export const updateComment = async (data: UpdateCommentPayload): Promise<Comment> => {
  const res = await fetchWithAuth(`/comment/${data.id}`, {
    method: 'PUT',
    body: JSON.stringify({ content: data.content })
  })

  if (!res.ok) throw new Error('Erreur lors de la mise à jour du commentaire')

  return res.json()
}
