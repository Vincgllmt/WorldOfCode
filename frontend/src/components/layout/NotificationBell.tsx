"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, MessageCircle, UserPlus, Heart, Settings } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import {
    useUnreadCount,
    useNotificationList,
    useMarkRead,
    useMarkAllRead,
} from '@/hooks/useNotifications'
import { cn } from '@/lib/utils'
import { useSettingsModal } from '@/contexts/SettingsModalContext'
import type { Notification } from '@/interfaces/notification'

function timeAgo(dateStr: string): string {
    const now = new Date()
    const date = new Date(dateStr)
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (seconds < 60) return 'à l\'instant'
    if (seconds < 3600) return `il y a ${Math.floor(seconds / 60)} min`
    if (seconds < 86400) return `il y a ${Math.floor(seconds / 3600)}h`
    return `il y a ${Math.floor(seconds / 86400)}j`
}

function NotificationIcon({ type }: { type: string }) {
    switch (type) {
        case 'comment':
            return <MessageCircle className="h-5 w-5 text-blue-500" />
        case 'follow':
            return <UserPlus className="h-5 w-5 text-green-500" />
        case 'like':
            return <Heart className="h-5 w-5 text-red-500 fill-red-500" />
        default:
            return <Bell className="h-5 w-5 text-muted-foreground" />
    }
}

function getNotificationUrl(notif: Notification): string | null {
    switch (notif.type) {
        case 'comment':
        case 'like':
            return notif.relatedEntityId ? `/post/${notif.relatedEntityId}` : null
        case 'follow':
            return `/user/${notif.senderId}`
        default:
            return null
    }
}

export default function NotificationBell() {
    const router = useRouter()
    const { openSettings } = useSettingsModal()
    const [open, setOpen] = useState(false)
    const { data: unreadData } = useUnreadCount()
    const { data: notifData, isLoading } = useNotificationList(1, 15)
    const markRead = useMarkRead()
    const markAllRead = useMarkAllRead()

    const unreadCount = unreadData?.count ?? 0
    const notifications = notifData?.items ?? []

    const handleNotificationClick = (notif: Notification) => {
        if (!notif.isRead) {
            markRead.mutate(notif.id)
        }
        const url = getNotificationUrl(notif)
        if (url) {
            setOpen(false)
            router.push(url)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen && unreadCount > 0) {
            markAllRead.mutate()
        }
    }

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <button className="relative p-1 text-muted-foreground hover:text-primary transition">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <>
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 animate-ping opacity-75" />
                        </>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 max-h-[28rem] overflow-hidden flex flex-col">
                <div className="px-4 py-3 border-b flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Notifications</h3>
                    <button
                        onClick={() => { setOpen(false); openSettings('notifications') }}
                        className="text-muted-foreground hover:text-foreground transition"
                        title="Paramètres des notifications"
                    >
                        <Settings className="h-4 w-4" />
                    </button>
                </div>
                <div className="overflow-y-auto max-h-72">
                    {isLoading && <p className="p-4 text-sm text-muted-foreground">Chargement...</p>}
                    {!isLoading && notifications.length === 0 && (
                        <p className="p-4 text-sm text-muted-foreground text-center">Aucune notification</p>
                    )}
                    {notifications.map((notif) => (
                        <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={cn(
                                "w-full text-left px-4 py-3 border-b last:border-b-0 hover:bg-muted/50 transition",
                                !notif.isRead && "bg-primary/5"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <span className="mt-0.5 shrink-0">
                                    <NotificationIcon type={notif.type} />
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={cn("text-sm", !notif.isRead && "font-medium")}>
                                        {notif.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        {timeAgo(notif.createdAt)}
                                    </p>
                                </div>
                                {!notif.isRead && (
                                    <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => { setOpen(false); openSettings('notifications') }}
                    className="border-t px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition flex items-center justify-center gap-2"
                >
                    <Settings className="h-3.5 w-3.5" />
                    Accéder aux paramètres
                </button>
            </PopoverContent>
        </Popover>
    )
}
