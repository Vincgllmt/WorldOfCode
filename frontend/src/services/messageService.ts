import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { Message } from "@/interfaces/message"

export async function getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetchWithAuth(`/messaging/conversations/${conversationId}/messages`)

    if (!res.ok) throw new Error("Erreur lors du chargement des messages")
    return res.json()
}

export interface MessageSearchResult {
    id: string
    body: string
    type: string
    createdAt: string
    conversationId: string
    sender: { id: number; username: string }
    conversation: {
        id: string
        type: string
        participants: { id: number; username: string }[]
    } | null
}

export async function searchMessages(query: string): Promise<MessageSearchResult[]> {
    const res = await fetchWithAuth(`/messaging/messages/search?q=${encodeURIComponent(query)}`)
    if (!res.ok) throw new Error("Erreur lors de la recherche")
    return res.json()
}
