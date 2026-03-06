import { getCookie } from 'cookies-next'
import type { UploadImageResponse } from '@/interfaces/post'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090/api'

type UploadableImage = File | Blob

export const uploadImage = async (file: UploadableImage): Promise<UploadImageResponse> => {
  const token = getCookie('token')
  const formData = new FormData()

  const filename = file instanceof File ? file.name : 'upload'
  formData.append('file', file, filename)

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!response.ok) {
    throw new Error("Erreur lors de l'upload de l'image")
  }

  const data: UploadImageResponse = await response.json()

  if (!data?.url) {
    throw new Error('Réponse upload invalide')
  }

  return data
}
