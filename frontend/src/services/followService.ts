import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { FollowResponse, Follower, Following } from '@/interfaces/follow'

export const followUser = async (userId: number): Promise<FollowResponse> => {
  const res = await fetchWithAuth(`/follow/${userId}`, {
    method: 'POST',
  })

  if (!res.ok) throw new Error('Erreur lors du suivi de l\'utilisateur')
  return res.json()
}

export const unfollowUser = async (userId: number): Promise<FollowResponse> => {
  const res = await fetchWithAuth(`/follow/${userId}`, {
    method: 'DELETE',
  })

  if (!res.ok) throw new Error('Erreur lors du désabonnement de l\'utilisateur')
  return res.json()
}

export const getFollowers = async (userId: number): Promise<Follower[]> => {
  const res = await fetchWithAuth(`/follow/${userId}/followers`)

  if (!res.ok) throw new Error('Erreur lors du chargement des followers')
  return res.json()
}

export const getFollowing = async (userId: number): Promise<Following[]> => {
  const res = await fetchWithAuth(`/follow/${userId}/following`)

  if (!res.ok) throw new Error('Erreur lors du chargement des utilisateurs suivis')
  return res.json()
}
