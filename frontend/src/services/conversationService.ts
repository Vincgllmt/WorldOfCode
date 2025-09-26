import { getCookie } from "cookies-next"
import { Conversation, CreateConversationPayload } from "@/interfaces/conversation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090"

export async function getConversations(): Promise<Conversation[]> {
    const token = getCookie("token")
    const res = await fetch(`${API_URL}/api/message/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throw new Error("Erreur lors du chargement des conversations")
    return res.json()
}

export async function getConversationById(id: string): Promise<Conversation> {
    const token = getCookie("token")
    const res = await fetch(`${API_URL}/api/message/conversations/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throw new Error("Erreur lors de la récupération de la conversation")
    return res.json()
}

export async function createConversation(
    payload: CreateConversationPayload
): Promise<Conversation> {
    const token = getCookie("token")
    const res = await fetch(`${API_URL}/api/message/conversations`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    })

    if (!res.ok) throw new Error("Erreur lors de la création de la conversation")
    return res.json()
}
