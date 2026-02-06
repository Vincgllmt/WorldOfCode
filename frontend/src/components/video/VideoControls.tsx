"use client"

import type { VideoControlsProps } from "@/interfaces/video"

export function VideoControls({
    isMuted,
    isCameraOff,
    isScreenSharing,
    screenShareDisabled,
    onToggleMute,
    onToggleCamera,
    onToggleScreenShare,
    onEndCall,
}: VideoControlsProps) {
    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 bg-card/80 px-6 py-3 rounded-full backdrop-blur-md shadow-lg border border-border">
            {/* Toggle Caméra */}
            <button
                onClick={onToggleCamera}
                className={`p-4 rounded-full transition-colors ${
                    isCameraOff
                        ? "bg-muted hover:bg-accent"
                        : "bg-secondary hover:bg-accent"
                }`}
                title={isCameraOff ? "Activer la caméra" : "Désactiver la caméra"}
            >
                {isCameraOff ? (
                    <CameraOffIcon className="w-6 h-6 text-foreground" />
                ) : (
                    <CameraIcon className="w-6 h-6 text-foreground" />
                )}
            </button>

            {/* Toggle Micro */}
            <button
                onClick={onToggleMute}
                className={`p-4 rounded-full transition-colors ${
                    isMuted
                        ? "bg-destructive hover:bg-destructive/80"
                        : "bg-secondary hover:bg-accent"
                }`}
                title={isMuted ? "Activer le micro" : "Couper le micro"}
            >
                {isMuted ? (
                    <MicOffIcon className="w-6 h-6 text-white" />
                ) : (
                    <MicIcon className="w-6 h-6 text-foreground" />
                )}
            </button>

            {/* Toggle Partage d'écran */}
            <button
                onClick={onToggleScreenShare}
                disabled={screenShareDisabled}
                className={`p-4 rounded-full transition-colors ${
                    screenShareDisabled
                        ? "bg-muted opacity-50 cursor-not-allowed"
                        : isScreenSharing
                            ? "bg-blue-500 hover:bg-blue-600"
                            : "bg-secondary hover:bg-accent"
                }`}
                title={screenShareDisabled ? "Un partage d'écran est déjà en cours" : isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
            >
                <ScreenShareIcon className={`w-6 h-6 ${isScreenSharing ? "text-white" : "text-foreground"}`} />
            </button>

            {/* Raccrocher */}
            <button
                onClick={onEndCall}
                className="p-4 rounded-full bg-destructive hover:bg-destructive/80 transition-colors"
                title="Raccrocher"
            >
                <PhoneOffIcon className="w-6 h-6 text-white" />
            </button>
        </div>
    )
}

// === Icônes SVG ===

function CameraIcon({ className }: { className?: string }) {
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

function CameraOffIcon({ className }: { className?: string }) {
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
                d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409"
            />
        </svg>
    )
}

function MicIcon({ className }: { className?: string }) {
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
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
            />
        </svg>
    )
}

function MicOffIcon({ className }: { className?: string }) {
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
                d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z"
            />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        </svg>
    )
}

function ScreenShareIcon({ className }: { className?: string }) {
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
                d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25A2.25 2.25 0 0 1 5.25 3h13.5A2.25 2.25 0 0 1 21 5.25Z"
            />
        </svg>
    )
}

function PhoneOffIcon({ className }: { className?: string }) {
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
                d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z"
            />
        </svg>
    )
}
