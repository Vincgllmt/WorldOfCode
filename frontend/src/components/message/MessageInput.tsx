import { useState } from "react"
import CustomEmojiPicker from "./EmojiPicker"
import { Smile } from "lucide-react"

type Props = {
    onSend: (body: string) => void
}

export function MessageInput({ onSend }: Props) {
    const [input, setInput] = useState("")
    const [showPicker, setShowPicker] = useState(false)

    const handleSend = () => {
        if (input.trim()) {
            onSend(input)
            setInput("")
        }
    }

    return (
        <div className="flex gap-2 relative">
            <button
                type="button"
                onClick={() => setShowPicker((prev) => !prev)}
                className="p-2 border rounded"
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

            <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                    }
                }}
                className="flex-1 border rounded px-2"
                placeholder="Écrire un message..."
            />

            <button
                onClick={handleSend}
                className="bg-green-600 text-white px-4 rounded"
            >
                Envoyer
            </button>
        </div>
    )
}
