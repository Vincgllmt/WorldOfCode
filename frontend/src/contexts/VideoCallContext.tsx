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
    closeProducer,
    getLocalMediaStream,
    getScreenShareStream,
    createStreamFromTrack,
} from "@/lib/video/mediasoupClient"
import type {
    CallState,
    NewProducerEvent,
    ProducerClosedEvent,
} from "@/interfaces/video"
import toast from "react-hot-toast"

// ─── Types d'appel entrant ───
interface IncomingCall {
    conversationId: string
    callerId: number
    callerUsername: string
}

interface VideoCallContextType {
    // État
    isCallActive: boolean
    isMinimized: boolean
    callState: CallState
    isMuted: boolean
    isCameraOff: boolean
    isScreenSharing: boolean
    localStream: MediaStream | null
    screenStream: MediaStream | null
    remoteStreams: Map<string, MediaStream>
    currentConversationId: string | null

    // Appel entrant
    incomingCall: IncomingCall | null
    acceptIncomingCall: () => void
    rejectIncomingCall: () => void

    // Actions
    startCall: (conversationId: string) => Promise<void>
    endCall: () => void
    toggleMute: () => void
    toggleCamera: () => void
    toggleScreenShare: () => void
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
    const [isScreenSharing, setIsScreenSharing] = useState(false)
    const [localStream, setLocalStream] = useState<MediaStream | null>(null)
    const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map())
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)

    // Appel entrant
    const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null)

    // Refs MediaSoup
    const deviceRef = useRef<Device | null>(null)
    const sendTransportRef = useRef<MediasoupTypes.Transport | null>(null)
    const recvTransportRef = useRef<MediasoupTypes.Transport | null>(null)
    const videoProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const audioProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const screenProducerRef = useRef<MediasoupTypes.Producer | null>(null)
    const consumersRef = useRef<Map<string, MediasoupTypes.Consumer>>(new Map())
    const localStreamRef = useRef<MediaStream | null>(null)

    // Refs stables pour les callbacks utilisés dans les listeners socket
    const isCallActiveRef = useRef(isCallActive)
    const incomingCallRef = useRef(incomingCall)
    const userRef = useRef(user)

    // Garder les refs synchronisées avec l'état
    useEffect(() => { isCallActiveRef.current = isCallActive }, [isCallActive])
    useEffect(() => { incomingCallRef.current = incomingCall }, [incomingCall])
    useEffect(() => { userRef.current = user }, [user])

    // ─── Connexion socket globale ───
    // Connecte le socket dès qu'un user est authentifié,
    // pour pouvoir recevoir les appels entrants depuis n'importe quelle page
    useEffect(() => {
        if (!user?.token || !user?.id) return

        console.log("🔌 VideoCallProvider: user detected", user.id, "socket.connected=", socket.connected)

        // Toujours mettre à jour les credentials
        socket.auth = { token: user.token, userId: user.id }

        if (!socket.connected) {
            socket.connect()
            console.log("🔌 VideoCallProvider: socket.connect() called for user", user.id)
        }
    }, [user])

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

        // Reset des refs
        deviceRef.current = null
        sendTransportRef.current = null
        recvTransportRef.current = null
        videoProducerRef.current = null
        audioProducerRef.current = null
        screenProducerRef.current = null
        localStreamRef.current = null

        // Reset de l'état des streams
        setRemoteStreams(new Map())
        setLocalStream(null)
        setScreenStream(null)
        setIsScreenSharing(false)
    }, [])

    // Connexion MediaSoup réelle (utilisée après acceptation de l'appel)
    const connectToVideoRoom = useCallback(
        async (conversationId: string) => {
            const currentUser = userRef.current
            if (!currentUser) return

            try {
                setIsMuted(false)
                setIsCameraOff(false)
                setCurrentConversationId(conversationId)
                setIsCallActive(true)
                setCallState("calling")

                // S'assurer que le socket est connecté
                if (!socket.connected) {
                    socket.auth = { token: currentUser.token, userId: currentUser.id }
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
                console.error("Failed to connect to video room:", error)
                toast.error("Erreur de connexion à l'appel")
                setCallState("idle")
                setIsCallActive(false)
                setCurrentConversationId(null)
            }
        },
        [handleConsumeProducer]
    )

    // Ref stable pour connectToVideoRoom (utilisée dans les listeners socket)
    const connectToVideoRoomRef = useRef(connectToVideoRoom)
    useEffect(() => { connectToVideoRoomRef.current = connectToVideoRoom }, [connectToVideoRoom])

    // Démarrer un appel (appelant) — émet call_initiate puis attend la réponse
    const startCall = useCallback(
        async (conversationId: string) => {
            if (!user) return

            // Si un appel est déjà en cours sur la même conversation, ne rien faire
            if (isCallActive && currentConversationId === conversationId) {
                console.log("Call already active on this conversation")
                return
            }

            // Cleanup des ressources précédentes si existantes
            if (currentConversationId && currentConversationId !== conversationId) {
                leaveVideoRoom(currentConversationId)
                cleanupResources()
            }

            // S'assurer que le socket est connecté
            if (!socket.connected) {
                socket.auth = { token: user.token, userId: user.id }
                socket.connect()
            }

            setCurrentConversationId(conversationId)
            setIsCallActive(true)
            setCallState("calling")

            // Émettre l'appel au serveur
            socket.emit("call_initiate", { conversation_id: conversationId }, (response: { success?: boolean; error?: string }) => {
                if (response?.error) {
                    console.error("Call initiate failed:", response.error)
                    if (response.error === "user_offline") {
                        toast.error("L'utilisateur est hors ligne")
                    } else {
                        toast.error("Impossible de lancer l'appel")
                    }
                    setCallState("idle")
                    setIsCallActive(false)
                    setCurrentConversationId(null)
                }
            })
        },
        [user, currentConversationId, cleanupResources, isCallActive]
    )

    // Accepter un appel entrant
    const acceptIncomingCall = useCallback(() => {
        if (!incomingCall) return

        const { conversationId } = incomingCall
        setIncomingCall(null)

        // Notifier le serveur
        socket.emit("call_accept", { conversation_id: conversationId })

        // Se connecter à la room vidéo (le destinataire se connecte immédiatement)
        connectToVideoRoomRef.current(conversationId)
    }, [incomingCall])

    // Refuser un appel entrant
    const rejectIncomingCall = useCallback(() => {
        if (!incomingCall) return

        socket.emit("call_reject", { conversation_id: incomingCall.conversationId })
        setIncomingCall(null)
    }, [incomingCall])

    // Terminer l'appel
    const endCall = useCallback(() => {
        // Si on est en train d'appeler (pas encore connecté), annuler l'appel
        if (callState === "calling" && currentConversationId) {
            socket.emit("call_cancel", { conversation_id: currentConversationId })
        }

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
        setIsScreenSharing(false)
        setIsCallActive(false)
        setIsMinimized(false)
        setCurrentConversationId(null)
    }, [currentConversationId, cleanupResources, callState])

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

    // Toggle partage d'écran
    const toggleScreenShare = useCallback(async () => {
        if (!sendTransportRef.current) return

        if (isScreenSharing) {
            if (screenStream) {
                screenStream.getTracks().forEach((track) => track.stop())
            }
            if (screenProducerRef.current && currentConversationId) {
                closeProducer(currentConversationId, screenProducerRef.current)
            }
            screenProducerRef.current = null
            setScreenStream(null)
            setIsScreenSharing(false)
        } else {
            try {
                const stream = await getScreenShareStream()
                const screenTrack = stream.getVideoTracks()[0]

                screenTrack.onended = () => {
                    if (screenProducerRef.current && currentConversationId) {
                        closeProducer(currentConversationId, screenProducerRef.current)
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
    }, [isScreenSharing, screenStream, currentConversationId])

    // Set minimized
    const setMinimized = useCallback((minimized: boolean) => {
        setIsMinimized(minimized)
    }, [])

    // ─── Écouter les événements de signalisation d'appel ───
    // Les listeners utilisent des refs pour éviter de se réinscrire à chaque changement d'état
    useEffect(() => {
        if (!user) return

        // Appel entrant
        const onIncomingCall = ({ conversation_id, callerId, callerUsername }: {
            conversation_id: string
            callerId: number
            callerUsername: string
        }) => {
            console.log("📞 Incoming call from", callerUsername)
            // Ne pas afficher si on est déjà en appel
            if (isCallActiveRef.current) {
                socket.emit("call_reject", { conversation_id })
                return
            }
            setIncomingCall({
                conversationId: conversation_id,
                callerId,
                callerUsername,
            })
        }

        // L'appel a été accepté par le destinataire → l'appelant se connecte
        const onCallAccepted = ({ conversation_id }: { conversation_id: string }) => {
            console.log("📞 Call accepted, connecting to room:", conversation_id)
            connectToVideoRoomRef.current(conversation_id)
        }

        // L'appel a été refusé
        const onCallRejected = () => {
            console.log("📞 Call rejected")
            toast.error("L'appel a été refusé")
            setCallState("idle")
            setIsCallActive(false)
            setCurrentConversationId(null)
        }

        // L'appel a expiré (timeout 30s)
        const onCallTimeout = () => {
            console.log("📞 Call timeout")
            toast.error("Pas de réponse")
            setCallState("idle")
            setIsCallActive(false)
            setCurrentConversationId(null)
        }

        // L'appelant a annulé
        const onCallCancelled = ({ conversation_id }: { conversation_id: string }) => {
            console.log("📞 Call cancelled for:", conversation_id)
            if (incomingCallRef.current?.conversationId === conversation_id) {
                setIncomingCall(null)
            }
        }

        socket.on("incoming_call", onIncomingCall)
        socket.on("call_accepted", onCallAccepted)
        socket.on("call_rejected", onCallRejected)
        socket.on("call_timeout", onCallTimeout)
        socket.on("call_cancelled", onCallCancelled)

        return () => {
            socket.off("incoming_call", onIncomingCall)
            socket.off("call_accepted", onCallAccepted)
            socket.off("call_rejected", onCallRejected)
            socket.off("call_timeout", onCallTimeout)
            socket.off("call_cancelled", onCallCancelled)
        }
    }, [user]) // ← Dépendance unique : user. Les refs gèrent le reste.

    // Écouter les événements socket pour la vidéo (producers)
    // On écoute dès que currentConversationId est défini (pas seulement quand "connected")
    // car les new_producer events peuvent arriver pendant la phase de connexion
    useEffect(() => {
        if (!currentConversationId) return

        // File d'attente pour les producers reçus avant que les transports soient prêts
        const pendingProducers: string[] = []
        let isProcessing = false

        const processPendingProducers = async () => {
            if (isProcessing) return
            isProcessing = true

            while (pendingProducers.length > 0) {
                const producerId = pendingProducers[0]
                // Attendre que le recv transport soit prêt
                if (!recvTransportRef.current || !deviceRef.current) {
                    // Réessayer dans 500ms
                    setTimeout(processPendingProducers, 500)
                    isProcessing = false
                    return
                }
                pendingProducers.shift()
                try {
                    await handleConsumeProducer(producerId, currentConversationId)
                } catch (err) {
                    console.error("Failed to consume producer:", producerId, err)
                }
            }
            isProcessing = false
        }

        const onNewProducer = async ({ producerId, peerId }: NewProducerEvent) => {
            console.log("📹 New producer event:", { producerId, peerId, myId: socket.id })
            if (peerId === socket.id) return

            // Si les transports sont prêts, consommer immédiatement
            if (recvTransportRef.current && deviceRef.current) {
                try {
                    await handleConsumeProducer(producerId, currentConversationId)
                } catch (err) {
                    console.error("Failed to consume producer:", producerId, err)
                }
            } else {
                // Sinon, mettre en file d'attente
                console.log("📹 Transport not ready, queuing producer:", producerId)
                pendingProducers.push(producerId)
                processPendingProducers()
            }
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
    }, [currentConversationId, handleConsumeProducer])

    // Écouter la déconnexion du socket
    useEffect(() => {
        const onDisconnect = (reason: string) => {
            console.log("🔴 Socket disconnected:", reason)
            if (isCallActiveRef.current) {
                console.log("🔴 Call was active, cleaning up...")
                cleanupResources()
                setCallState("idle")
                setIsCallActive(false)
                setCurrentConversationId(null)
            }
            // Ne PAS effacer incomingCall ici :
            // Socket.IO peut se reconnecter automatiquement (raison "transport close" ou "ping timeout")
            // et l'appel entrant est toujours valide côté backend pendant 30s.
            // On efface seulement si la déconnexion est volontaire (logout).
            if (reason === "io client disconnect") {
                setIncomingCall(null)
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
    }, [cleanupResources])

    return (
        <VideoCallContext.Provider
            value={{
                isCallActive,
                isMinimized,
                callState,
                isMuted,
                isCameraOff,
                isScreenSharing,
                localStream,
                screenStream,
                remoteStreams,
                currentConversationId,
                incomingCall,
                acceptIncomingCall,
                rejectIncomingCall,
                startCall,
                endCall,
                toggleMute,
                toggleCamera,
                toggleScreenShare,
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
