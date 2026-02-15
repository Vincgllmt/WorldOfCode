import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Video } from "lucide-react"

type Props = {
    title: string
    onStartCall?: () => void
}

export function ConversationHeader({ title, onStartCall }: Props) {
    const initials = title.slice(0, 2).toUpperCase()

    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-background border-b border-border shadow-sm">
            <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {initials}
                </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
                <h1 className="text-[15px] font-semibold text-foreground truncate">{title}</h1>
            </div>

            {onStartCall && (
                <button
                    onClick={onStartCall}
                    className="p-2.5 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                    title="Démarrer un appel vidéo"
                >
                    <Video className="w-5 h-5" />
                </button>
            )}
        </div>
    )
}
