import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
    getConversations,
    getConversationById,
    createConversation,
    markConversationAsRead
} from "@/services/conversationService"
import { CreateConversationPayload } from "@/interfaces/conversation"
import toast from "react-hot-toast"
import { Conversation } from "@/interfaces/conversation"
import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { socket } from "@/lib/socket"
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications"
import { getUserById } from "@/services/userService"

type MessageCreatedPayload = {
    id?: string
    conversation_id?: string
    sender_id?: number | string
    body?: string
    type?: string
}

export function useConversationRealtime(userId?: string | number) {
    const queryClient = useQueryClient()
    const pathname = usePathname()
    const { showNotification } = useBrowserNotifications()

    useEffect(() => {
        if (!userId) return

        if (!socket.connected) {
            socket.auth = { userId }
            socket.connect()
        }

        const onMessageCreated = async (payload?: MessageCreatedPayload) => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] })

            if (!payload) return

            // Ne pas notifier ses propres messages
            if (payload.sender_id && String(payload.sender_id) === String(userId)) return

            // Ne pas notifier si on est dans la conversation ouverte
            if (payload.conversation_id && pathname === `/message/${payload.conversation_id}`) return

            // Résoudre le nom de l'expéditeur depuis le cache conversations
            const conversations = queryClient.getQueryData<Conversation[]>(["conversations"])
            const conv = conversations?.find((c) => c.id === payload.conversation_id)
            const sender = conv?.participants.find((p) => String(p.id) === String(payload.sender_id))
            const senderName = sender?.username || 'Nouveau message'

            // Corps de la notification (tronqué et nettoyé du HTML)
            let preview = (payload.body ?? '').replace(/<[^>]*>/g, '').trim()
            if (payload.type === 'image') preview = '📷 Photo'
            else if (payload.type === 'file') preview = '📎 Fichier'
            if (preview.length > 120) preview = preview.slice(0, 117) + '…'

            // Récupérer l'avatar du sender (depuis le cache React Query d'abord, sinon fetch)
            let avatarUrl: string | null = null
            const senderId = payload.sender_id
            if (senderId !== undefined && senderId !== null) {
                const cachedUser = queryClient.getQueryData<{ avatarUrl?: string | null }>(['user', Number(senderId)])
                if (cachedUser?.avatarUrl) {
                    avatarUrl = cachedUser.avatarUrl
                } else {
                    try {
                        const u = await queryClient.fetchQuery({
                            queryKey: ['user', Number(senderId)],
                            queryFn: () => getUserById(Number(senderId)),
                            staleTime: 60_000,
                        })
                        avatarUrl = u?.avatarUrl ?? null
                    } catch {
                        // ignore — on utilisera le logo par défaut
                    }
                }
            }

            showNotification({
                title: senderName,
                body: preview,
                icon: avatarUrl ?? undefined,
                tag: `msg-${payload.conversation_id}`,
                onClick: payload.conversation_id ? () => {
                    window.location.href = `/message/${payload.conversation_id}`
                } : undefined,
            })
        }

        socket.on("message_created", onMessageCreated)

        return () => {
            socket.off("message_created", onMessageCreated)
        }
    }, [userId, queryClient, pathname, showNotification])
}

export function useConversations() {
    return useQuery({
        queryKey: ["conversations"],
        queryFn: getConversations,
        refetchInterval: 10_000,
    })
}

export const useConversation = (id: string) => {
    return useQuery({
        queryKey: ["conversation", id],
        queryFn: () => getConversationById(id),
        enabled: !!id,
    })
}

export const useCreateConversation = () => {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (payload: CreateConversationPayload) => createConversation(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["conversations"] })
        },
        onError: () => {
            toast.error("Erreur lors de la création de la conversation")
        },
    })
}


export function useMarkConversationAsRead() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (conversationId: string) => markConversationAsRead(conversationId),
        onSuccess: (_, conversationId) => {

            queryClient.invalidateQueries({ queryKey: ["conversations"] })

            queryClient.setQueryData<Conversation[]>(["conversations"], (old: Conversation[] | undefined) => {
                if (!old) return old
                return old.map(conv =>
                    conv.id === conversationId
                        ? {
                            ...conv,
                            lastMessage: conv.lastMessage
                                ? { ...conv.lastMessage, read: true }
                                : undefined
                        }
                        : conv
                )
            })
        },
    })
}
