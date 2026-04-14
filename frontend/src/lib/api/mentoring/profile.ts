import { fetchWithAuth } from '@/lib/fetchWithAuth'
import type { MentorProfile } from '@/types/mentoring'

export async function getMyMentorProfile(): Promise<MentorProfile> {
  const res = await fetchWithAuth('/api/mentor/profile')
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur'), { status: res.status })
  }
  return res.json()
}

export async function createMentorProfile(data: {
  specialties?: number[]
  teachingStyle?: string
  maxActiveMentees?: number
  mentorBio?: string
}): Promise<MentorProfile> {
  const res = await fetchWithAuth('/api/mentor/profile', {
    method: 'POST',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur création profil'), { status: res.status })
  }
  return res.json()
}

export async function updateMentorProfile(data: {
  specialties?: number[]
  teachingStyle?: string
  maxActiveMentees?: number
  mentorBio?: string
}): Promise<MentorProfile> {
  const res = await fetchWithAuth('/api/mentor/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur mise à jour profil'), { status: res.status })
  }
  return res.json()
}

export async function toggleAvailability(isAvailable: boolean): Promise<{ isAvailable: boolean; mode: string }> {
  const res = await fetchWithAuth('/api/mentor/profile/availability', {
    method: 'PATCH',
    body: JSON.stringify({ isAvailable }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error ?? 'Erreur toggle disponibilité'), { status: res.status })
  }
  return res.json()
}
