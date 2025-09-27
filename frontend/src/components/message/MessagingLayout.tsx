"use client"

import { useConversations } from "@/hooks/useConversations"
import Link from "next/link"

export default function MessagingLayout({ children }: { children: React.ReactNode }) {
    const { data: conversations, isLoading } = useConversations()

    return (
        <div className="flex h-[calc(100vh-64px)]">
            {/* Liste des conversations */}
            <div className="w-1/3 border-r overflow-y-auto">
                <h2 className="p-4 font-bold text-lg">Vos conversations</h2>
                {isLoading && <p className="p-4">Chargement...</p>}
                {conversations?.map((conv) => (
                    <Link
                        key={conv.id}
                        href={`/message/${conv.id}`}
                        className="block p-4 hover:bg-gray-100 border-b"
                    >
                        <div className="font-semibold">
                            {conv.title || conv.participants.map((p) => p.username).join(", ")}
                        </div>
                        <div className="text-sm text-gray-500 truncate">
                            {conv.messages && conv.messages.length > 0
                                ? conv.messages[conv.messages.length - 1].body
                                : "Aucun message"}
                        </div>
                    </Link>
                ))}
            </div>

            {/* Conversation sélectionnée */}
            <div className="flex-1 flex flex-col">{children}</div>
        </div>
    )
}
