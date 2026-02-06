import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Video } from "lucide-react"

type Props = {
    title: string
    onStartCall?: () => void
}

export function ConversationHeader({ title, onStartCall }: Props) {
    const initials = title.slice(0, 2).toUpperCase()

    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 shadow-sm">
            <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-green-200 text-green-800 text-sm font-semibold">
                    {initials}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-semibold text-gray-900 truncate">{title}</h1>
            </div>

            {onStartCall && (
                <button
                    onClick={onStartCall}
                    className="p-2.5 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-green-600"
                    title="Démarrer un appel vidéo"
                >
                    <Video className="w-5 h-5" />
                </button>
            )}
        </div>
    )
}
