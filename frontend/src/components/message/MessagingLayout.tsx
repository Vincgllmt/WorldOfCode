"use client"

import { useConversations } from "@/hooks/useConversations"
import Link from "next/link"
import clsx from "clsx"
import { useAuth } from '@/hooks/useAuth'
import { useParams } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageCircle } from "lucide-react"

function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) {
        return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    }
    if (days === 1) return "Hier"
    if (days < 7) return date.toLocaleDateString("fr-FR", { weekday: "short" })
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

export default function MessagingLayout({ children }: { children: React.ReactNode }) {
    const { data: conversations, isLoading } = useConversations()
    const { user } = useAuth()
    const params = useParams<{ id?: string }>()
    const currentConversationId = params?.id

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Sidebar conversations */}
            <div className="w-[360px] border-r border-gray-200 bg-white flex flex-col">
                {/* Header sidebar */}
                <div className="px-5 py-4 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                </div>

                {/* Liste */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading && (
                        <div className="flex items-center justify-center py-10 text-gray-400">
                            <div className="w-5 h-5 border-2 border-gray-300 border-t-green-500 rounded-full animate-spin" />
                        </div>
                    )}

                    {conversations
                        ?.slice()
                        .sort((a, b) => {
                            const aDate = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
                            const bDate = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
                            return bDate - aDate
                        })
                        .map((conv) => {
                            const isActive = conv.id === currentConversationId
                            const isUnread =
                                conv.lastMessage &&
                                !conv.lastMessage.read &&
                                conv.lastMessage.sender?.id !== user?.id &&
                                conv.id !== currentConversationId

                            const displayName = conv.title || conv.participants.map((p) => p.username).join(", ")
                            const initials = displayName.slice(0, 2).toUpperCase()

                            return (
                                <Link
                                    key={conv.id}
                                    href={`/message/${conv.id}`}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 transition-colors relative",
                                        isActive
                                            ? "bg-green-50 border-l-3 border-l-green-500"
                                            : "hover:bg-gray-50 border-l-3 border-l-transparent"
                                    )}
                                >
                                    {/* Avatar */}
                                    <Avatar className="h-12 w-12 shrink-0">
                                        <AvatarFallback className={clsx(
                                            "text-sm font-semibold",
                                            isActive ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-600"
                                        )}>
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>

                                    {/* Contenu */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className={clsx(
                                                "truncate text-[15px]",
                                                isUnread ? "font-bold text-gray-900" : "font-medium text-gray-900"
                                            )}>
                                                {displayName}
                                            </span>
                                            {conv.lastMessage && (
                                                <span className={clsx(
                                                    "text-xs shrink-0 ml-2",
                                                    isUnread ? "text-green-600 font-semibold" : "text-gray-400"
                                                )}>
                                                    {formatTime(conv.lastMessage.createdAt)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <span className={clsx(
                                                "text-sm truncate",
                                                isUnread ? "font-semibold text-gray-700" : "text-gray-500"
                                            )}>
                                                {conv.lastMessage ? conv.lastMessage.body : "Aucun message"}
                                            </span>
                                            {isUnread && (
                                                <span className="ml-2 shrink-0 w-5 h-5 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center">
                                                    1
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}

                    {!isLoading && conversations?.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <MessageCircle className="h-12 w-12 mb-3 stroke-1" />
                            <p className="text-sm">Aucune conversation</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Conversation sélectionnée */}
            <div className="flex-1 flex flex-col bg-gray-50">{children}</div>
        </div>
    )
}
