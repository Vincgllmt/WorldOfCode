import { useEffect, useRef, useState, useCallback } from "react"
import type { Device, types as MediasoupTypes } from "mediasoup-client"
import { socket } from "@/lib/socket"
import { useAuth } from "@/hooks/useAuth"
import {
    joinVideoRoom,
    leaveVideoRoom,
    createDevice,
    createTransport,
    produceTrack,
    consumeProducer,
    closeProducer,
    getLocalMediaStream,
    getScreenShareStream,
    createStreamFromTrack,
} from "@/lib/video/mediasoupClient"
import type {
    CallState,
    UseVideoCallOptions,
    UseVideoCallReturn,
    NewProducerEvent,
    ProducerClosedEvent,
} from "@/interfaces/video"

export function useVideoCall({
    conversationId,
    onCallEnded,
}: UseVideoCallOptions): UseVideoCallReturn {
    const { user } = useAuth()

    // === État de l'appel ===
    const [callState, setCallState] = useState<CallState>("idle")
    const [isMuted, setIsMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(false)
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null)

    // === Refs MediaSoup ===
    const deviceRef = useRef<Device | null>(null)
    const sendTransportRef = useRef<MediasoupTypes.Transport | null>(null)
    const recvTransportRef = useRef<MediasoupTypes.Transport | null>(null)
    const videoProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const audioProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const screenProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const consumersRef = useRef<Map<string, MediasoupTypes.Consumer>>(new Map())
    const localStreamRef = useRef<MediaStream | null>(null)

    // === Consommer un producer distant ===
    const handleConsumeProducer = useCallback(
        async (producerId: string) => {
            if (!recvTransportRef.current || !deviceRef.current) return
            if (consumersRef.current.has(producerId)) return

            const consumer = await consumeProducer(
                recvTransportRef.current,
                deviceRef.current,
                conversationId,
                producerId
            )

            if (!consumer) return

            consumersRef.current.set(producerId, consumer)

            const stream = createStreamFromTrack(consumer.track)

            if (consumer.kind === "video") {
                setRemoteStreams((prev) => {
                    const newMap = new Map(prev)
                    newMap.set(producerId, stream)
                    return newMap
                })
            }

            if (consumer.kind === "audio") {
                // Créer un élément audio pour jouer le son distant
                const audio = document.createElement("audio")
                audio.srcObject = stream
                audio.autoplay = true
                audio.id = `remote-audio-${producerId}`
                document.body.appendChild(audio)
            }
        },
        [conversationId]
    )

    // === Démarrer l'appel ===
    const startCall = useCallback(async () => {
        if (!user) return

        try {
            setCallState("calling")

            // S'assurer que le socket est connecté
            if (!socket.connected) {
                socket.auth = { token: user.token, userId: user.id }
                socket.connect()
            }

            // Rejoindre la room vidéo
            const { rtpCapabilities, existingProducers } = await joinVideoRoom(conversationId)

            // Créer le device MediaSoup
            const device = await createDevice(rtpCapabilities)
            deviceRef.current = device

            // Créer les transports
            sendTransportRef.current = await createTransport(device, conversationId, "send")
            recvTransportRef.current = await createTransport(device, conversationId, "recv")

            // Obtenir le flux local (caméra + micro)
            const stream = await getLocalMediaStream()
            localStreamRef.current = stream
            setLocalStream(stream)

            // Produire vidéo et audio
            const videoTrack = stream.getVideoTracks()[0]
            const audioTrack = stream.getAudioTracks()[0]

            if (videoTrack) {
                videoProducerRef.current = await produceTrack(sendTransportRef.current, videoTrack)
            }

            if (audioTrack) {
                audioProducerRef.current = await produceTrack(sendTransportRef.current, audioTrack)
            }

            // Consommer les producers existants
            for (const producerId of existingProducers) {
                await handleConsumeProducer(producerId)
            }

            setCallState("connected")
        } catch (error) {
            console.error("Failed to start call:", error)
            setCallState("idle")
        }
    }, [user, conversationId, handleConsumeProducer])

    // === Terminer l'appel ===
    const endCall = useCallback(() => {
        // Fermer les producers
        videoProducerRef.current?.close()
        audioProducerRef.current?.close()
        screenProducerRef.current?.close()

        // Fermer les consumers
        consumersRef.current.forEach((consumer) => consumer.close())
        consumersRef.current.clear()

        // Fermer les transports
        sendTransportRef.current?.close()
        recvTransportRef.current?.close()

        // Arrêter le flux local
        localStreamRef.current?.getTracks().forEach((track) => track.stop())

        // Supprimer les éléments audio distants
        document.querySelectorAll('[id^="remote-audio-"]').forEach((el) => el.remove())

        // Quitter la room vidéo
        leaveVideoRoom(conversationId)

        // Reset des refs
        deviceRef.current = null
        sendTransportRef.current = null
        recvTransportRef.current = null
        videoProducerRef.current = null
        audioProducerRef.current = null
        screenProducerRef.current = null
        localStreamRef.current = null

        // Reset de l'état
        setRemoteStreams(new Map())
        setLocalStream(null)
        setScreenStream(null)
        setCallState("idle")
        setIsMuted(false)
        setIsCameraOff(false)
        setIsScreenSharing(false)

        onCallEnded?.()
    }, [conversationId, onCallEnded])

    // === Toggle mute ===
    const toggleMute = useCallback(() => {
        if (audioProducerRef.current) {
            if (isMuted) {
                audioProducerRef.current.resume()
            } else {
                audioProducerRef.current.pause()
            }
            setIsMuted(!isMuted)
        }
    }, [isMuted])

    // === Toggle caméra ===
    const toggleCamera = useCallback(() => {
        if (videoProducerRef.current) {
            if (isCameraOff) {
                videoProducerRef.current.resume()
            } else {
                videoProducerRef.current.pause()
            }
            setIsCameraOff(!isCameraOff)
        }
    }, [isCameraOff])

    // === Toggle partage d'écran ===
    const toggleScreenShare = useCallback(async () => {
        if (!sendTransportRef.current) return

        if (isScreenSharing) {
            // Stopper les tracks, notifier le serveur, fermer le producer
            if (screenStream) {
                screenStream.getTracks().forEach((track) => track.stop())
            }
            if (screenProducerRef.current) {
                closeProducer(conversationId, screenProducerRef.current)
            }
            screenProducerRef.current = null
            setScreenStream(null)
            setIsScreenSharing(false)
        } else {
            try {
                const stream = await getScreenShareStream()
                const screenTrack = stream.getVideoTracks()[0]

                screenTrack.onended = () => {
                    if (screenProducerRef.current) {
                        closeProducer(conversationId, screenProducerRef.current)
                    }
                    screenProducerRef.current = null
                    setScreenStream(null)
                    setIsScreenSharing(false)
                }

                screenProducerRef.current = await produceTrack(sendTransportRef.current!, screenTrack)
                setScreenStream(stream)
                setIsScreenSharing(true)
            } catch {
                // L'utilisateur a annulé le sélecteur d'écran
            }
        }
    }, [isScreenSharing, screenStream, conversationId])

    // === Écouter les événements socket ===
    useEffect(() => {
        if (callState !== "connected") return

        const onNewProducer = async ({ producerId, peerId }: NewProducerEvent) => {
            if (peerId === socket.id) return
            await handleConsumeProducer(producerId)
        }

        const onProducerClosed = ({ producerId }: ProducerClosedEvent) => {
            const consumer = consumersRef.current.get(producerId)
            if (consumer) {
                consumer.close()
                consumersRef.current.delete(producerId)
            }

            setRemoteStreams((prev) => {
                const newMap = new Map(prev)
                newMap.delete(producerId)
                return newMap
            })

            // Supprimer l'élément audio si existant
            document.getElementById(`remote-audio-${producerId}`)?.remove()
        }

        socket.on("new_producer", onNewProducer)
        socket.on("producer_closed", onProducerClosed)

        return () => {
            socket.off("new_producer", onNewProducer)
            socket.off("producer_closed", onProducerClosed)
        }
    }, [callState, handleConsumeProducer])

    // === Cleanup au démontage ===
    useEffect(() => {
        return () => {
            if (callState === "connected") {
                endCall()
            }
        }
    }, [])

    return {
        callState,
        isMuted,
        isCameraOff,
        isScreenSharing,
        remoteStreams,
        localStream,
        screenStream,
        startCall,
        endCall,
        toggleMute,
        toggleCamera,
        toggleScreenShare,
    }
}
