import { MessageCircle } from "lucide-react"

export default function MessageIndexPage() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground bg-muted/50">
            <MessageCircle className="h-16 w-16 mb-4 stroke-1" />
            <p className="text-lg font-medium text-foreground/60">Vos messages</p>
            <p className="text-sm mt-1">Sélectionnez une conversation pour commencer</p>
        </div>
    )
}
