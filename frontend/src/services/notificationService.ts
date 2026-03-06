import { getCookie } from 'cookies-next'
import { NotificationPaginatedResponse, UnreadCountResponse } from '@/interfaces/notification'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const getNotifications = async (page = 1, limit = 20): Promise<NotificationPaginatedResponse> => {
    const token = getCookie('token')
    const res = await fetch(`${API_URL}/notifications?page=${page}&limit=${limit}`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) throw new Error('Erreur lors du chargement des notifications')
    return res.json()
}

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
    const token = getCookie('token')
    const res = await fetch(`${API_URL}/notifications/unread-count`, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) throw new Error('Erreur lors du chargement du compteur')
    return res.json()
}

export const markNotificationRead = async (id: number): Promise<void> => {
    const token = getCookie('token')
    const res = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) throw new Error('Erreur lors du marquage de la notification')
}

export const markAllNotificationsRead = async (): Promise<void> => {
    const token = getCookie('token')
    const res = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    })
    if (!res.ok) throw new Error('Erreur lors du marquage des notifications')
}
