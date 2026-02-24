import { getCookie } from 'cookies-next'
import { FollowResponse, Follower, Following } from '@/interfaces/follow'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const followUser = async (userId: number): Promise<FollowResponse> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/follow/${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Erreur lors du suivi de l’utilisateur')
  return res.json()
}

export const unfollowUser = async (userId: number): Promise<FollowResponse> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/follow/${userId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Erreur lors du désabonnement de l’utilisateur')
  return res.json()
}

export const getFollowers = async (userId: number): Promise<Follower[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/follow/${userId}/followers`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Erreur lors du chargement des followers')
  return res.json()
}

export const getFollowing = async (userId: number): Promise<Following[]> => {
  const token = getCookie('token')
  const res = await fetch(`${API_URL}/follow/${userId}/following`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!res.ok) throw new Error('Erreur lors du chargement des utilisateurs suivis')
  return res.json()
}
