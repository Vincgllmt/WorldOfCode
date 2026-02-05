"use client"

import { useEffect, useRef } from "react"
import type { RemoteVideoProps } from "@/interfaces/video"

export function RemoteVideo({ stream, producerId }: RemoteVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted // La vidéo est muted, l'audio est géré séparément
            data-producer-id={producerId}
            className="w-full h-full object-cover"
        />
    )
}
