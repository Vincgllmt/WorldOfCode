type Props = {
    title: string
    onStartCall?: () => void
}

export function ConversationHeader({ title, onStartCall }: Props) {
    return (
        <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">{title}</h1>

            {onStartCall && (
                <button
                    onClick={onStartCall}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Démarrer un appel vidéo"
                >
                    <VideoCallIcon className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </button>
            )}
        </div>
    )
}

function VideoCallIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={className}
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
            />
        </svg>
    )
}
