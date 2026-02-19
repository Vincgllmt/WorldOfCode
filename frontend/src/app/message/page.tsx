import { MessageCircle, Send } from "lucide-react"

export default function MessageIndexPage() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center text-muted-foreground bg-muted/50">
            <div className="relative mb-6">
                <MessageCircle className="h-20 w-20 stroke-[0.8] text-muted-foreground/40" />
                <Send className="h-8 w-8 absolute -bottom-1 -right-1 text-primary/60" />
            </div>
            <p className="text-xl font-semibold text-foreground/70">Vos messages</p>
            <p className="text-sm mt-2 text-muted-foreground max-w-xs text-center">
                Sélectionnez une conversation dans la liste ou cliquez sur l&apos;icône <span className="inline-flex align-text-bottom"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg></span> pour en démarrer une nouvelle.
            </p>
        </div>
    )
}
