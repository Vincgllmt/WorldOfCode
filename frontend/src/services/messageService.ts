import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { Message } from "@/interfaces/message"

export async function getMessages(conversationId: string): Promise<Message[]> {
    const res = await fetchWithAuth(`/messaging/conversations/${conversationId}/messages`)

    if (!res.ok) throw new Error("Erreur lors du chargement des messages")
    return res.json()
}
