"use client"

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { socket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'
import { useBrowserNotifications } from '@/hooks/useBrowserNotifications'
import toast from 'react-hot-toast'
import {
    getNotifications,
    getUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
} from '@/services/notificationService'
import type { Notification } from '@/interfaces/notification'

export const useUnreadCount = () => {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: getUnreadCount,
        refetchInterval: 30000,
    })
}

export const useNotificationList = (page = 1, limit = 20) => {
    return useQuery({
        queryKey: ['notifications', 'list', page, limit],
        queryFn: () => getNotifications(page, limit),
    })
}

export const useMarkRead = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: markNotificationRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })
}

export const useMarkAllRead = () => {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: markAllNotificationsRead,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
    })
}

function getNotificationIcon(type: string): string {
    switch (type) {
        case 'comment': return '💬'
        case 'follow': return '👤'
        case 'like': return '❤️'
        case 'appointment_confirmed': return '📅'
        default: return '🔔'
    }
}

function getNotificationUrl(notification: Notification): string | null {
    if (notification.type === 'follow' && notification.senderId) {
        return `/user/${notification.senderId}`
    }
    if ((notification.type === 'comment' || notification.type === 'like') && notification.relatedEntityId) {
        return `/post/${notification.relatedEntityId}`
    }
    return null
}

export const useNotificationRealtime = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const { showNotification } = useBrowserNotifications()

    useEffect(() => {
        if (!user) return

        const onNewNotification = (notification: Notification) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })

            toast(notification.message, {
                icon: getNotificationIcon(notification.type),
                duration: 4000,
            })

            // Notification navigateur (uniquement si onglet pas focus)
            const url = getNotificationUrl(notification)
            showNotification({
                title: `${getNotificationIcon(notification.type)} ${notification.senderUsername}`,
                body: notification.message,
                tag: `notif-${notification.id}`,
                onClick: url ? () => { window.location.href = url } : undefined,
            })

            if (notification.type === 'appointment_confirmed' && notification.relatedEntityId) {
                window.dispatchEvent(new CustomEvent('appointment:confirmed', {
                    detail: { sessionId: notification.relatedEntityId },
                }))
            }
        }

        socket.on('new_notification', onNewNotification)

        return () => {
            socket.off('new_notification', onNewNotification)
        }
    }, [user, queryClient, showNotification])
}
