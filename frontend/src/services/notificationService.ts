import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { NotificationPaginatedResponse, UnreadCountResponse } from '@/interfaces/notification'

export const getNotifications = async (page = 1, limit = 20): Promise<NotificationPaginatedResponse> => {
    const res = await fetchWithAuth(`/notifications?page=${page}&limit=${limit}`)
    if (!res.ok) throw new Error('Erreur lors du chargement des notifications')
    return res.json()
}

export const getUnreadCount = async (): Promise<UnreadCountResponse> => {
    const res = await fetchWithAuth('/notifications/unread-count')
    if (!res.ok) throw new Error('Erreur lors du chargement du compteur')
    return res.json()
}

export const markNotificationRead = async (id: number): Promise<void> => {
    const res = await fetchWithAuth(`/notifications/${id}/read`, {
        method: 'PUT',
    })
    if (!res.ok) throw new Error('Erreur lors du marquage de la notification')
}

export const markAllNotificationsRead = async (): Promise<void> => {
    const res = await fetchWithAuth('/notifications/read-all', {
        method: 'PUT',
    })
    if (!res.ok) throw new Error('Erreur lors du marquage des notifications')
}
