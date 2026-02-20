import { getCookie } from 'cookies-next'
import type { Skill } from '@/interfaces/user'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const getAllSkills = async (): Promise<Skill[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/api/skills`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })
  if (!res.ok) throw new Error('Erreur lors du chargement des compétences')
  return res.json()
}
