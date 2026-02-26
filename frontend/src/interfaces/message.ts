export interface Message {
    id: string
    conversationId: string
    body: string
    type: 'text' | 'image' | 'file' | 'call'
    read: boolean
    sender: {
        id: number
        username: string
    }
    createdAt: string
    editedAt?: string | null
    deletedAt?: string | null
}

export interface CreateMessagePayload {
    conversationId: string
    body: string
    type?: 'text' | 'image' | 'file' | 'call'
}

export interface LastMessage {
    id: string
    body: string
    createdAt: string
    sender: {
        id: number
        username: string
    }
    read: boolean
}
