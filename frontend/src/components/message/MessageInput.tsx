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
        <div className="px-4 py-3 bg-background border-t border-border">
            <div className="flex items-center gap-2 relative">
                {/* Emoji */}
                <button
                    type="button"
                    onClick={() => setShowPicker((prev) => !prev)}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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
                    className="flex-1 bg-muted rounded-full px-4 py-2.5 text-[15px] text-foreground placeholder-muted-foreground outline-none focus:bg-muted/80 transition-colors"
                    placeholder="Écrire un message..."
                />

                {/* Bouton envoyer */}
                <button
                    onClick={handleSend}
                    disabled={!input.trim()}
                    className="p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <Send className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
