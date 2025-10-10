// import { useState } from "react"
// import CustomEmojiPicker from "./EmojiPicker"
// import { Smile } from "lucide-react"

// type Props = {
//     onSend: (body: string) => void
//     conversationId?: string
// }

// export function MessageInput({ onSend }: Props) {
//     const [input, setInput] = useState("")
//     const [showPicker, setShowPicker] = useState(false)



//     const handleSend = () => {
//         if (input.trim()) {
//             onSend(input)
//             setInput("")
//         }
//     }

//     return (
//         <div className="flex gap-2 relative">
//             <button
//                 type="button"
//                 onClick={() => setShowPicker((prev) => !prev)}
//                 className="p-2 border rounded"
//             >
//                 <Smile className="h-5 w-5" />
//             </button>

//             {showPicker && (
//                 <CustomEmojiPicker
//                     onSelect={(emoji) => {
//                         setInput((prev) => prev + emoji)
//                         setShowPicker(false)
//                     }}
//                 />
//             )}

//             <input
//                 value={input}
//                 onChange={(e) => setInput(e.target.value)}
//                 onKeyDown={(e) => {
//                     if (e.key === "Enter" && !e.shiftKey) {
//                         e.preventDefault()
//                         handleSend()
//                     }
//                 }}
//                 className="flex-1 border rounded px-2"
//                 placeholder="Écrire un message..."
//             />

//             <button
//                 onClick={handleSend}
//                 className="bg-green-600 text-white px-4 rounded"
//             >
//                 Envoyer
//             </button>
//         </div>
//     )
// }
import { useState, useRef } from "react"
import CustomEmojiPicker from "./EmojiPicker"
import { Smile } from "lucide-react"
import { socket } from "@/lib/socket"

type Props = {
    onSend: (body: string) => void
    conversationId?: string // 👈 ajouté pour envoyer l'ID au socket
}

export function MessageInput({ onSend, conversationId }: Props) {
    const [input, setInput] = useState("")
    const [showPicker, setShowPicker] = useState(false)
    const typingTimeout = useRef<NodeJS.Timeout | null>(null)

    // 🔹 Fonction utilitaire pour signaler qu’on tape
    const emitTyping = (isTyping: boolean) => {
        if (!conversationId) return
        socket.emit("typing", { conversation_id: conversationId, is_typing: isTyping })
    }

    const handleSend = () => {
        if (input.trim()) {
            onSend(input)
            setInput("")
            emitTyping(false) // 🧹 stop typing quand on envoie
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
        emitTyping(true)

        // ⏳ stop après 1,5s sans frappe
        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => emitTyping(false), 1500)
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
                onChange={handleChange} // 👈 remplace ton ancien onChange
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
