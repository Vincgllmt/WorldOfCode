import { getCookie } from 'cookies-next'
import type { UploadImageResponse } from '@/interfaces/post'

type UploadableImage = File | Blob

export const uploadImage = async (file: UploadableImage): Promise<UploadImageResponse> => {
  const token = getCookie('token')
  const formData = new FormData()

  const filename = file instanceof File ? file.name : 'upload'
  formData.append('file', file, filename)

  const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}

  // URL relative → même origine que woc.woc
  const response = await fetch('/api/upload', {
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
