"use client"

import {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect,
    ReactNode,
} from "react"
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
    getLocalMediaStream,
    createStreamFromTrack,
} from "@/lib/video/mediasoupClient"
import type {
    CallState,
    NewProducerEvent,
    ProducerClosedEvent,
} from "@/interfaces/video"

interface VideoCallContextType {
    // État
    isCallActive: boolean
    isMinimized: boolean
    callState: CallState
    isMuted: boolean
    isCameraOff: boolean
    localStream: MediaStream | null
    remoteStreams: Map<string, MediaStream>
    currentConversationId: string | null

    // Actions
    startCall: (conversationId: string) => Promise<void>
    endCall: () => void
    toggleMute: () => void
    toggleCamera: () => void
    setMinimized: (minimized: boolean) => void
}

const VideoCallContext = createContext<VideoCallContextType | null>(null)

export function VideoCallProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth()

    // État de l'appel
    const [isCallActive, setIsCallActive] = useState(false)
    const [isMinimized, setIsMinimized] = useState(false)
    const [callState, setCallState] = useState<CallState>("idle")
    const [isMuted, setIsMuted] = useState(false)
    const [isCameraOff, setIsCameraOff] = useState(false)
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

    // Refs MediaSoup
    const deviceRef = useRef<Device | null>(null)
    const sendTransportRef = useRef<MediasoupTypes.Transport | null>(null)
    const recvTransportRef = useRef<MediasoupTypes.Transport | null>(null)
    const videoProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const audioProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const consumersRef = useRef<Map<string, MediasoupTypes.Consumer>>(new Map())
    const localStreamRef = useRef<MediaStream | null>(null)

    // Consommer un producer distant
    const handleConsumeProducer = useCallback(
        async (producerId: string, conversationId: string) => {
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
                const audio = document.createElement("audio")
                audio.srcObject = stream
                audio.autoplay = true
                audio.id = `remote-audio-${producerId}`
                document.body.appendChild(audio)
            }
        },
        []
    )

    // Cleanup complet des ressources
    const cleanupResources = useCallback(() => {
        // Fermer les producers
        videoProducerRef.current?.close()
        audioProducerRef.current?.close()

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

        // Reset des refs
        deviceRef.current = null
        sendTransportRef.current = null
        recvTransportRef.current = null
        videoProducerRef.current = null
        audioProducerRef.current = null
        localStreamRef.current = null

        // Reset de l'état des streams
        setRemoteStreams(new Map())
        setLocalStream(null)
    }, [])

    // Démarrer l'appel
    const startCall = useCallback(
        async (conversationId: string) => {
            if (!user) return

            // Si un appel est déjà en cours sur la même conversation, ne rien faire
            if (isCallActive && currentConversationId === conversationId) {
                console.log("Call already active on this conversation")
                return
            }

            try {
                // Cleanup des ressources précédentes si existantes
                if (currentConversationId && currentConversationId !== conversationId) {
                    leaveVideoRoom(currentConversationId)
                    cleanupResources()
                }

                // Reset mute/camera state pour un appel frais
                setIsMuted(false)
                setIsCameraOff(false)

                setCurrentConversationId(conversationId)
                setIsCallActive(true)
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
                    await handleConsumeProducer(producerId, conversationId)
                }

                setCallState("connected")
            } catch (error) {
                console.error("Failed to start call:", error)
                setCallState("idle")
                setIsCallActive(false)
                setCurrentConversationId(null)
            }
        },
        [user, handleConsumeProducer, currentConversationId, cleanupResources, isCallActive]
    )

    // Terminer l'appel
    const endCall = useCallback(() => {
        // Quitter la room vidéo
        if (currentConversationId) {
            leaveVideoRoom(currentConversationId)
        }

        // Cleanup toutes les ressources
        cleanupResources()

        // Reset de l'état UI
        setCallState("idle")
        setIsMuted(false)
        setIsCameraOff(false)
        setIsCallActive(false)
        setIsMinimized(false)
        setCurrentConversationId(null)
    }, [currentConversationId, cleanupResources])

    // Toggle mute
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

    // Toggle caméra
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

    // Set minimized
    const setMinimized = useCallback((minimized: boolean) => {
        setIsMinimized(minimized)
    }, [])

    // Écouter les événements socket pour la vidéo
    useEffect(() => {
        if (callState !== "connected" || !currentConversationId) return

        const onNewProducer = async ({ producerId, peerId }: NewProducerEvent) => {
            console.log("📹 New producer event:", { producerId, peerId, myId: socket.id })
            if (peerId === socket.id) return
            await handleConsumeProducer(producerId, currentConversationId)
        }

        const onProducerClosed = ({ producerId }: ProducerClosedEvent) => {
            console.log("📹 Producer closed event:", producerId)
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

            document.getElementById(`remote-audio-${producerId}`)?.remove()
        }

        socket.on("new_producer", onNewProducer)
        socket.on("producer_closed", onProducerClosed)

        return () => {
            socket.off("new_producer", onNewProducer)
            socket.off("producer_closed", onProducerClosed)
        }
    }, [callState, currentConversationId, handleConsumeProducer])

    // Écouter la déconnexion du socket (séparé pour ne pas être affecté par les dépendances)
    useEffect(() => {
        const onDisconnect = (reason: string) => {
            console.log("🔴 Socket disconnected:", reason)
            // Si on était en appel, on termine proprement
            if (isCallActive) {
                console.log("🔴 Call was active, cleaning up...")
                cleanupResources()
                setCallState("idle")
                setIsCallActive(false)
                setCurrentConversationId(null)
            }
        }

        const onConnect = () => {
            console.log("🟢 Socket connected:", socket.id)
        }

        socket.on("disconnect", onDisconnect)
        socket.on("connect", onConnect)

        return () => {
            socket.off("disconnect", onDisconnect)
            socket.off("connect", onConnect)
        }
    }, [isCallActive, cleanupResources])

    return (
        <VideoCallContext.Provider
            value={{
                isCallActive,
                isMinimized,
                callState,
                isMuted,
                isCameraOff,
                localStream,
                remoteStreams,
                currentConversationId,
                startCall,
                endCall,
                toggleMute,
                toggleCamera,
                setMinimized,
            }}
        >
            {children}
        </VideoCallContext.Provider>
    )
}

export function useVideoCallContext() {
    const context = useContext(VideoCallContext)
    if (!context) {
        throw new Error("useVideoCallContext must be used within a VideoCallProvider")
    }
    return context
}
