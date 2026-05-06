"use client"

import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { socket } from '@/lib/socket'
import { useAuth } from '@/hooks/useAuth'
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

export const useNotificationRealtime = () => {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    useEffect(() => {
        if (!user) return

        const onNewNotification = (notification: Notification) => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] })

            toast(notification.message, {
                icon: getNotificationIcon(notification.type),
                duration: 4000,
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
    }, [user, queryClient])
}
