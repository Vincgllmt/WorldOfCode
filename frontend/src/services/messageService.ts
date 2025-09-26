import { getCookie } from "cookies-next"
import { Message } from "@/interfaces/message"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090"

export async function getMessages(conversationId: string): Promise<Message[]> {
    const token = getCookie("token")
    const res = await fetch(`${API_URL}/api/messaging/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) throw new Error("Erreur lors du chargement des messages")
    return res.json()
}
