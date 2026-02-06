"use client"

import { useState } from "react"
import { useVideoCallContext } from "@/contexts/VideoCallContext"
import { LocalVideo } from "./LocalVideo"
import { RemoteVideo } from "./RemoteVideo"
import { VideoControls } from "./VideoControls"

export function VideoCallGlobal() {
    const {
        isCallActive,
        isMinimized,
        callState,
        isMuted,
        isCameraOff,
        isScreenSharing,
        localStream,
        screenStream,
        remoteStreams,
        endCall,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
        setMinimized,
    } = useVideoCallContext()

    // ID du flux sélectionné pour la vue principale (null = premier flux)
    const [mainStreamId, setMainStreamId] = useState<string | null>(null)

    if (!isCallActive) return null

    // Quelqu'un d'autre partage déjà (plus d'1 flux vidéo distant = caméra + écran)
    const someoneElseIsSharing = remoteStreams.size > 1 && !isScreenSharing

    // === MODE MINIMISÉ (Picture-in-Picture) ===
    if (isMinimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50 w-80 bg-card rounded-xl shadow-2xl overflow-hidden border border-border">
                {/* Vidéo principale (distante ou locale) */}
                <div className="relative aspect-video bg-muted">
                    {remoteStreams.size > 0 ? (
                        <RemoteVideo
                            stream={Array.from(remoteStreams.values())[0]}
                            producerId={Array.from(remoteStreams.keys())[0]}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <UserIcon className="w-12 h-12 text-muted-foreground" />
                        </div>
                    )}

                    {/* Mini vidéo locale en overlay */}
                    {localStream && !isCameraOff && (
                        <div className="absolute bottom-2 right-2 w-20 h-14 rounded-md overflow-hidden border border-border">
                            <video
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                                ref={(el) => {
                                    if (el && localStream) el.srcObject = localStream
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Contrôles minimisés */}
                <div className="flex items-center justify-between p-2 bg-secondary/90">
                    <div className="flex gap-1">
                        <button
                            onClick={toggleCamera}
                            className={`p-2 rounded-full ${isCameraOff ? "bg-muted" : "bg-accent"} hover:bg-accent transition-colors`}
                            title={isCameraOff ? "Activer caméra" : "Couper caméra"}
                        >
                            {isCameraOff ? (
                                <CameraOffIcon className="w-4 h-4 text-foreground" />
                            ) : (
                                <CameraIcon className="w-4 h-4 text-foreground" />
                            )}
                        </button>
                        <button
                            onClick={toggleMute}
                            className={`p-2 rounded-full ${isMuted ? "bg-destructive" : "bg-accent"} hover:bg-accent transition-colors`}
                            title={isMuted ? "Activer micro" : "Couper micro"}
                        >
                            {isMuted ? (
                                <MicOffIcon className="w-4 h-4 text-foreground" />
                            ) : (
                                <MicIcon className="w-4 h-4 text-foreground" />
                            )}
                        </button>
                        <button
                            onClick={endCall}
                            className="p-2 rounded-full bg-destructive hover:bg-destructive/80 transition-colors"
                            title="Raccrocher"
                        >
                            <PhoneOffIcon className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    <button
                        onClick={() => setMinimized(false)}
                        className="p-2 rounded-full bg-accent hover:bg-muted transition-colors"
                        title="Agrandir"
                    >
                        <MaximizeIcon className="w-4 h-4 text-foreground" />
                    </button>
                </div>
            </div>
        )
    }

    // === MODE PLEIN ÉCRAN ===
    return (
        <div className="fixed inset-0 z-50 bg-background">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-primary/30 to-transparent z-10">
                <div className="flex items-center justify-between">
                    <h2 className="text-foreground text-lg font-semibold">
                        {callState === "calling" && "Connexion..."}
                        {callState === "connected" && "Appel en cours"}
                        {callState === "ended" && "Appel terminé"}
                    </h2>
                    <div className="flex gap-2">
                        {/* Bouton minimiser */}
                        {callState === "connected" && (
                            <button
                                onClick={() => setMinimized(true)}
                                className="p-2 rounded-full hover:bg-accent transition-colors"
                                title="Minimiser"
                            >
                                <MinimizeIcon className="w-6 h-6 text-foreground" />
                            </button>
                        )}
                        <button
                            onClick={endCall}
                            className="p-2 rounded-full hover:bg-accent transition-colors"
                        >
                            <CloseIcon className="w-6 h-6 text-foreground" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Zone vidéo principale */}
            <div className="w-full h-full flex items-center justify-center">
                {callState === "calling" && (
                    <div className="text-center">
                        <div className="animate-pulse">
                            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                                <PhoneIcon className="w-10 h-10 text-primary-foreground" />
                            </div>
                        </div>
                        <p className="text-foreground text-lg">Connexion en cours...</p>
                    </div>
                )}

                {callState === "connected" && (() => {
                    const remoteEntries = Array.from(remoteStreams.entries())
                    const showLocalScreen = mainStreamId === "__local_screen__" && screenStream
                    const validMainId = !showLocalScreen && mainStreamId && remoteStreams.has(mainStreamId) ? mainStreamId : null
                    const mainRemoteEntry = validMainId
                        ? [validMainId, remoteStreams.get(validMainId)!] as [string, MediaStream]
                        : remoteEntries[0] || null
                    // Flux distants non affichés en plein écran
                    const secondaryEntries = showLocalScreen
                        ? remoteEntries
                        : mainRemoteEntry
                            ? remoteEntries.filter(([id]) => id !== mainRemoteEntry[0])
                            : []
                    const hasScreenContent = showLocalScreen || remoteEntries.length > 1

                    return (
                        <>
                            {/* Flux principal en plein écran */}
                            {showLocalScreen ? (
                                <div className="absolute inset-0 bg-black">
                                    <video
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-contain"
                                        ref={(el) => {
                                            if (el && screenStream) el.srcObject = screenStream
                                        }}
                                    />
                                </div>
                            ) : mainRemoteEntry ? (
                                <div className="absolute inset-0">
                                    <RemoteVideo stream={mainRemoteEntry[1]} producerId={mainRemoteEntry[0]} contain={hasScreenContent} />
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                                        <UserIcon className="w-10 h-10 text-muted-foreground" />
                                    </div>
                                    <p className="text-muted-foreground">En attente des autres participants...</p>
                                </div>
                            )}

                            {/* Flux secondaires en PiP cliquables (en haut à gauche) */}
                            {secondaryEntries.length > 0 && (
                                <div className="absolute top-16 left-4 flex flex-col gap-2 z-10">
                                    {secondaryEntries.map(([producerId, stream]) => (
                                        <button
                                            key={producerId}
                                            onClick={() => setMainStreamId(producerId)}
                                            className="w-40 h-24 rounded-lg overflow-hidden shadow-lg border-2 border-white/50 hover:border-blue-400 transition-colors cursor-pointer"
                                            title="Cliquer pour agrandir"
                                        >
                                            <RemoteVideo stream={stream} producerId={producerId} />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Preview écran partagé (PiP cliquable en bas à gauche) */}
                            {screenStream && !showLocalScreen && (
                                <button
                                    onClick={() => setMainStreamId("__local_screen__")}
                                    className="absolute bottom-24 left-4 w-48 h-28 bg-card rounded-lg overflow-hidden shadow-lg border-2 border-blue-500 hover:border-blue-400 transition-colors cursor-pointer z-10"
                                    title="Cliquer pour agrandir"
                                >
                                    <video
                                        autoPlay
                                        muted
                                        playsInline
                                        className="w-full h-full object-contain bg-black"
                                        ref={(el) => {
                                            if (el && screenStream) el.srcObject = screenStream
                                        }}
                                    />
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500/70 rounded text-xs text-white">
                                        Votre écran
                                    </div>
                                </button>
                            )}

                            {/* Vidéo locale (picture-in-picture) */}
                            <LocalVideo stream={localStream} isCameraOff={isCameraOff} />

                            {/* Contrôles */}
                            <VideoControls
                                isMuted={isMuted}
                                isCameraOff={isCameraOff}
                                isScreenSharing={isScreenSharing}
                                screenShareDisabled={someoneElseIsSharing}
                                onToggleMute={toggleMute}
                                onToggleCamera={toggleCamera}
                                onToggleScreenShare={toggleScreenShare}
                                onEndCall={endCall}
                            />
                        </>
                    )
                })()}
            </div>
        </div>
    )
}

// === Icônes ===

function CloseIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
    )
}

function MinimizeIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5 5.25 5.25" />
        </svg>
    )
}

function MaximizeIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
        </svg>
    )
}

function PhoneIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.054-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.733.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
        </svg>
    )
}

function PhoneOffIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 3.75 18 6m0 0 2.25 2.25M18 6l2.25-2.25M18 6l-2.25 2.25m1.5 13.5c-8.284 0-15-6.716-15-15V4.5A2.25 2.25 0 0 1 4.5 2.25h1.372c.516 0 .966.351 1.091.852l1.106 4.423c.11.44-.054.902-.417 1.173l-1.293.97a1.062 1.062 0 0 0-.38 1.21 12.035 12.035 0 0 0 7.143 7.143c.441.162.928-.004 1.21-.38l.97-1.293a1.125 1.125 0 0 1 1.173-.417l4.423 1.106c.5.125.852.575.852 1.091V19.5a2.25 2.25 0 0 1-2.25 2.25h-2.25Z" />
        </svg>
    )
}

function UserIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
    )
}

function CameraIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
    )
}

function CameraOffIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 0 1-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 0 0-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" />
        </svg>
    )
}

function MicIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
        </svg>
    )
}

function MicOffIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
        </svg>
    )
}
