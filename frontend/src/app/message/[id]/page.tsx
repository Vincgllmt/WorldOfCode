"use client"

import { useParams } from "next/navigation"
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages"
import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/hooks/useAuth"
import { useConversations } from "@/hooks/useConversations"

export default function ConversationPage() {
    const { id } = useParams<{ id: string }>()
    const { user } = useAuth()
    const userId = user?.id?.toString()
    const { messages, sendMessage } = useRealtimeMessages(id, userId)
    const { data: conversations } = useConversations()
    const [input, setInput] = useState("")
    const bottomRef = useRef<HTMLDivElement | null>(null)

    const conv = conversations?.find((c) => c.id === id)
    const otherUser =
        conv?.type === "direct"
            ? conv.participants.find((p) => p.id !== user?.id)
            : null

    const title = conv?.title || otherUser?.username || "Conversation"

    if (!userId) {
        return <p className="p-4 text-red-500">⚠️ Vous devez être connecté.</p>
    }

    const handleSend = () => {
        if (!input.trim()) return
        sendMessage(input)
        setInput("")
    }

    // Scroll auto vers le bas
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    return (
        <div className="flex flex-col h-[calc(100vh-64px)]">
            {/* 64px ≈ hauteur navbar */}
            <h1 className="text-xl font-bold p-4">{title}</h1>

            {/* Zone messages */}
            <div className="flex-1 overflow-y-auto border mx-4 mb-4 rounded p-4 space-y-2">
                {messages?.map((m, i) => {
                    const isMe = m.senderId?.toString() === userId
                    return (
                        <div
                            key={i}
                            className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`px-3 py-2 rounded-lg max-w-xs break-words ${isMe
                                    ? "bg-green-500 text-white rounded-br-none"
                                    : "bg-gray-200 text-black rounded-bl-none"
                                    }`}
                            >
                                {conv?.type === "group" && !isMe && (
                                    <div className="text-xs font-semibold mb-1 text-gray-600">
                                        {m.senderUsername}
                                    </div>
                                )}
                                {m.body}
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            {/* Zone input */}
            <div className="flex gap-2 p-4 border-t">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                    className="flex-1 border rounded px-3 py-2"
                    placeholder="Écrire un message..."
                />
                <button
                    onClick={handleSend}
                    className="bg-green-600 text-white px-6 py-2 rounded"
                >
                    Envoyer
                </button>
            </div>
        </div>
    )
}
