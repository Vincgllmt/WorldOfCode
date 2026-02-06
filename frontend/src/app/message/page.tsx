import { MessageCircle } from "lucide-react"

export default function MessageIndexPage() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center text-gray-400 bg-gray-50">
            <MessageCircle className="h-16 w-16 mb-4 stroke-1" />
            <p className="text-lg font-medium text-gray-500">Vos messages</p>
            <p className="text-sm mt-1">Sélectionnez une conversation pour commencer</p>
        </div>
    )
}
