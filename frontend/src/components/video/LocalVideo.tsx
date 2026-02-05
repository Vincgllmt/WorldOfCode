"use client"

import { useEffect, useRef } from "react"

interface LocalVideoProps {
    stream: MediaStream | null
    isCameraOff: boolean
    username?: string
}

export function LocalVideo({ stream, isCameraOff, username }: LocalVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <div className="absolute bottom-24 right-4 w-48 h-36 bg-card rounded-lg overflow-hidden shadow-lg border border-border z-10">
            {/* Vidéo locale */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className={`w-full h-full object-cover ${isCameraOff ? "hidden" : ""}`}
            />

            {/* Fallback quand caméra désactivée */}
            {isCameraOff && (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                    <div className="text-center">
                        <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-xl text-foreground">👤</span>
                        </div>
                        <span className="text-foreground text-sm">{username || "Vous"}</span>
                    </div>
                </div>
            )}

            {/* Label */}
            <div className="absolute bottom-2 left-2 px-2 py-1 bg-primary/70 rounded text-xs text-primary-foreground">
                Vous
            </div>
        </div>
    )
}
