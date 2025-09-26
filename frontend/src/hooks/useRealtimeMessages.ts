import { useEffect } from "react"
import { socket } from "@/lib/socket"
import { useMessages } from "@/hooks/useMessages"
import { Message } from "@/interfaces/message"

export const useRealtimeMessages = (conversationId: string, userId: string | number | undefined) => {
    const { data: messages, isLoading, error, refetch } = useMessages(conversationId)

    useEffect(() => {
        if (!conversationId || !userId) return

        if (!socket.connected) {
            socket.auth = { userId }
            socket.connect()
        }

        socket.emit("join_conversation", { conversation_id: conversationId })

        const onMessageCreated = (data: Message) => {
            // Dès qu’un message arrive → on resynchronise la liste
            refetch()
        }

        socket.on("message_created", onMessageCreated)

        return () => {
            socket.off("message_created", onMessageCreated)
            socket.emit("leave_conversation", { conversation_id: conversationId })
        }
    }, [conversationId, userId, refetch])

    const sendMessage = (body: string) => {
        if (!body.trim()) return
        const tempId = Date.now().toString()

        socket.emit("send_message", {
            conversation_id: conversationId,
            temp_id: tempId,
            body,
        })

        // Ajout optimiste immédiat (avant réponse du serveur)
        refetch()
    }

    return { messages, isLoading, error, sendMessage, refetch }
}
