"use client"

import { useConversations } from "@/hooks/useConversations"
import Link from "next/link"
import clsx from "clsx"
import { useAuth } from '@/hooks/useAuth'
export default function MessagingLayout({ children }: { children: React.ReactNode }) {
    const { data: conversations, isLoading } = useConversations()
    const { user, logout } = useAuth()
    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Liste des conversations */}
            <div className="w-1/3 border-r overflow-y-auto">
                <h2 className="p-4 font-bold text-lg">Vos conversations</h2>
                {isLoading && <p className="p-4">Chargement...</p>}
                {conversations
                    ?.slice()
                    .sort((a, b) => {
                        const aDate = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0
                        const bDate = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0
                        return bDate - aDate
                    })
                    .map((conv) => {
                        console.log(conv.lastMessage?.sender?.username)

                        const isUnread =
                            conv.lastMessage &&
                            !conv.lastMessage.read &&
                            conv.lastMessage.sender?.id !== user?.id


                        return (
                            <Link
                                key={conv.id}
                                href={`/message/${conv.id}`}
                                className={clsx(
                                    "flex items-center justify-between p-4 border-b transition",
                                    isUnread ? "hover:bg-green-50" : "hover:bg-green-50"
                                )}
                            >
                                {/* Infos conversation */}
                                <div className="flex-1 min-w-0">
                                    <div
                                        className={clsx(
                                            "font-semibold truncate",
                                            isUnread ? "font-bold  " : "text-black"
                                        )}
                                    >
                                        {conv.title || conv.participants.map((p) => p.username).join(", ")}
                                    </div>
                                    <div
                                        className={clsx(
                                            "text-sm truncate",
                                            isUnread ? "font-bold " : "text-gray-500"
                                        )}
                                    >
                                        {conv.lastMessage ? conv.lastMessage.body : "Aucun message"}
                                    </div>
                                </div>

                                {/* Pastille non lu */}
                                {isUnread && (
                                    <div className="ml-2 w-3 h-3 rounded-full bg-blue-600" />
                                )}
                            </Link>
                        )
                    })}
            </div>

            {/* Conversation sélectionnée */}
            <div className="flex-1 flex flex-col">{children}</div>
        </div>
    )
}
