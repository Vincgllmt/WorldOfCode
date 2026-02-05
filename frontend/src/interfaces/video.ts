import type { types as MediasoupTypes } from "mediasoup-client"

// === États de l'appel ===
export type CallState = "idle" | "calling" | "ringing" | "connected" | "ended"

// === Configuration ICE ===
export interface IceServer {
    urls: string | string[]
    username?: string
    credential?: string
}

// === Transport MediaSoup ===
export interface TransportOptions {
    id: string
    iceParameters: MediasoupTypes.IceParameters
    iceCandidates: MediasoupTypes.IceCandidate[]
    dtlsParameters: MediasoupTypes.DtlsParameters
}

// === Réponses du serveur ===
export interface JoinVideoResponse {
    rtpCapabilities: MediasoupTypes.RtpCapabilities
    existingProducers: string[]
}

export interface CreateTransportResponse extends TransportOptions {}

export interface ProduceResponse {
    id: string
}

export interface ConsumeResponse {
    id: string
    producerId: string
    kind: "audio" | "video"
    rtpParameters: MediasoupTypes.RtpParameters
    error?: string
}

// === Événements Socket ===
export interface NewProducerEvent {
    producerId: string
    peerId: string
}

export interface ProducerClosedEvent {
    producerId: string
}

// === Props des composants ===
export interface VideoCallProps {
    conversationId: string
    isOpen: boolean
    onClose: () => void
}

export interface VideoControlsProps {
    isMuted: boolean
    isCameraOff: boolean
    onToggleMute: () => void
    onToggleCamera: () => void
    onEndCall: () => void
}

export interface LocalVideoProps {
    stream: MediaStream | null
    isCameraOff: boolean
    username?: string
}

export interface RemoteVideoProps {
    stream: MediaStream
    producerId: string
}

// === État du hook useVideoCall ===
export interface VideoCallState {
    callState: CallState
    isMuted: boolean
    isCameraOff: boolean
    remoteStreams: Map<string, MediaStream>
}

// === Options du hook useVideoCall ===
export interface UseVideoCallOptions {
    conversationId: string
    onCallEnded?: () => void
}

// === Retour du hook useVideoCall ===
export interface UseVideoCallReturn extends VideoCallState {
    localStream: MediaStream | null
    startCall: () => Promise<void>
    endCall: () => void
    toggleMute: () => void
    toggleCamera: () => void
}
