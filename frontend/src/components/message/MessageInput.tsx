import { useState, useRef, useEffect } from "react"
import CustomEmojiPicker from "./EmojiPicker"
import { Smile, Send } from "lucide-react"
import { socket } from "@/lib/socket"

type Props = {
    onSend: (body: string) => void
    conversationId?: string
}

export function MessageInput({ onSend, conversationId }: Props) {
    const [input, setInput] = useState("")
    const [showPicker, setShowPicker] = useState(false)
    const typingTimeout = useRef<NodeJS.Timeout | null>(null)

    // Cleanup du timeout au démontage
    useEffect(() => {
        return () => {
            if (typingTimeout.current) clearTimeout(typingTimeout.current)
        }
    }, [])

    const emitTyping = (isTyping: boolean) => {
        if (!conversationId) return
        socket.emit("typing", { conversation_id: conversationId, is_typing: isTyping })
    }

    const handleSend = () => {
        if (input.trim()) {
            onSend(input)
            setInput("")
            emitTyping(false)
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
        emitTyping(true)

        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => emitTyping(false), 1500)
    }

    return (
        <div className="px-4 py-3 bg-white border-t border-gray-200">
            <div className="flex items-center gap-2 relative">
                {/* Emoji */}
                <button
                    type="button"
                    onClick={() => setShowPicker((prev) => !prev)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
                >
                    <Smile className="h-5 w-5" />
                </button>

                {showPicker && (
                    <CustomEmojiPicker
                        onSelect={(emoji) => {
                            setInput((prev) => prev + emoji)
                            setShowPicker(false)
                        }}
                    />
                )}

                {/* Input */}
                <input
                    value={input}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                    className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-[15px] text-gray-900 placeholder-gray-400 outline-none focus:bg-gray-200 transition-colors"
                    placeholder="Écrire un message..."
                />

                {/* Bouton envoyer */}
                <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2.5 rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Send className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
