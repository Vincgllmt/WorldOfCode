
import { getCookie } from 'cookies-next'
import { User, UpdateUserPayload } from '@/interfaces/user'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const updateUser = async (data: UpdateUserPayload): Promise<User> => {
  const token = getCookie('admin_token')
  const res = await fetch(`${API_URL}/api/user/${data.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Erreur lors de la mise à jour')
  return res.json()
}

export const deleteUser = async (id: number): Promise<void> => {
  const token = getCookie('admin_token')
  const res = await fetch(`${API_URL}/api/user/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    }
  })
  if (!res.ok) throw new Error('Erreur lors de la suppression')
}
