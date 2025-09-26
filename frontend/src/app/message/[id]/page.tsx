"use client"

import { useParams } from "next/navigation"
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages"
import { useState } from "react"

export default function ConversationPage() {
    const { id } = useParams<{ id: string }>()
    const userId = "32" // TODO: remplacer par ton vrai user connecté
    const { messages, sendMessage } = useRealtimeMessages(id, userId)
    const [input, setInput] = useState("")

    return (
        <div className="flex flex-col h-full p-4">
            <h1 className="text-xl font-bold mb-4">Conversation {id}</h1>
            <div className="flex-1 overflow-y-auto border p-2 mb-4 rounded">
                {messages?.map((m, i) => (
                    <div key={i} className="mb-2">
                        <strong>{m.sender?.username || "?"}:</strong> {m.body}
                    </div>
                ))}
            </div>
            <div className="flex gap-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="flex-1 border rounded px-2"
                    placeholder="Écrire un message..."
                />
                <button
                    onClick={() => {
                        sendMessage(input)
                        setInput("")
                    }}
                    className="bg-green-600 text-white px-4 rounded"
                >
                    Envoyer
                </button>
            </div>
        </div>
    )
}
