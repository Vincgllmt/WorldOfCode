export interface Notification {
    id: number
    type: 'comment' | 'follow' | 'like'
    message: string
    relatedEntityId: number | null
    isRead: boolean
    createdAt: string
    senderId: number
    senderUsername: string
}

export interface NotificationPaginatedResponse {
    items: Notification[]
    page: number
    limit: number
    totalItems: number
    totalPages: number
}

export interface UnreadCountResponse {
    count: number
}
