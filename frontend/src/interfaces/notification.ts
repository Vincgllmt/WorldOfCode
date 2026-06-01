export interface Notification {
    id: number
    type: 'comment' | 'follow' | 'like'
        | 'mentoring_new_request' | 'mentoring_request_accepted'
        | 'mentoring_pin_expired' | 'mentoring_rating_reminder'
        | 'mentoring_session_scheduled' | 'appointment_confirmed'
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
