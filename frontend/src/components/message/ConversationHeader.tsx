import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Video } from "lucide-react"
import { useOnlineUsers } from "@/hooks/useOnlineUsers"

type Props = {
    title: string
    userId?: number
    onStartCall?: () => void
}

export function ConversationHeader({ title, userId, onStartCall }: Props) {
    const initials = title.slice(0, 2).toUpperCase()
    const { isOnline } = useOnlineUsers()
    const online = isOnline(userId)

    const avatarWithStatus = (
        <div className="relative">
            <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                    {initials}
                </AvatarFallback>
            </Avatar>
            {online && (
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
            )}
        </div>
    )

    const nameContent = (
        <div>
            <h1 className="text-[15px] font-semibold text-foreground truncate">{title}</h1>
            {online && (
                <p className="text-xs text-green-500 font-medium">En ligne</p>
            )}
        </div>
    )

    return (
        <div className="flex items-center gap-3 px-5 py-3 bg-background border-b border-border shadow-sm">
            {userId ? (
                <Link href={`/user/${userId}`} className="hover:opacity-80 transition-opacity">
                    {avatarWithStatus}
                </Link>
            ) : (
                avatarWithStatus
            )}

            <div className="flex-1 min-w-0">
                {userId ? (
                    <Link href={`/user/${userId}`} className="hover:underline">
                        {nameContent}
                    </Link>
                ) : (
                    nameContent
                )}
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
