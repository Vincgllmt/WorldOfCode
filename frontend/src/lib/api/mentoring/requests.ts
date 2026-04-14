import { fetchWithAuth } from '@/lib/fetchWithAuth'

export async function getMentorFeed(params: { page?: number; limit?: number; techStack?: string } = {}) {
  const qs = new URLSearchParams()
  if (params.page) qs.set('page', String(params.page))
  if (params.limit) qs.set('limit', String(params.limit))
  if (params.techStack) qs.set('techStack', params.techStack)

  const res = await fetchWithAuth(`/api/mentor/requests?${qs}`)
  if (!res.ok) throw new Error('Erreur feed')
  return res.json() as Promise<{ data: import('@/types/mentoring').MentoringRequest[]; meta: { page: number; limit: number; total: number } }>
}

export async function getMentorRequestDetail(id: number) {
  const res = await fetchWithAuth(`/api/mentor/requests/${id}`)
  if (!res.ok) throw new Error('Demande non trouvée')
  return res.json()
}

export async function pinRequest(id: number) {
  const res = await fetchWithAuth(`/api/mentor/requests/${id}/pin`, { method: 'POST' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error((err as { error?: string }).error ?? 'Erreur'), { status: res.status, code: (err as { code?: string }).code })
  }
  return res.json()
}

export async function unpinRequest(id: number) {
  const res = await fetchWithAuth(`/api/mentor/requests/${id}/pin`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Erreur désépinglage')
}

export async function acceptRequest(id: number, body: { format: string; conversationId?: string }) {
  const res = await fetchWithAuth(`/api/mentor/requests/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error((err as { error?: string }).error ?? 'Erreur'), { status: res.status, code: (err as { code?: string }).code })
  }
  return res.json()
}
