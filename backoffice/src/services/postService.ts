import { getCookie } from 'cookies-next'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function deletePost(id: number): Promise<void> {
  const token = getCookie('admin_token')
  const res = await fetch(`${API_URL}/api/post/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Erreur lors de la suppression du post')
}
