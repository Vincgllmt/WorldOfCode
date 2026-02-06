import * as mediasoupClient from "mediasoup-client"
import type { types as MediasoupTypes } from "mediasoup-client"
import { socket } from "@/lib/socket"
import { getIceServers } from "./iceServers"
import type {
    TransportOptions,
    JoinVideoResponse,
    CreateTransportResponse,
    ProduceResponse,
    ConsumeResponse,
} from "@/interfaces/video"

// === Helper pour émettre avec callback (promisifié) ===
export function emit<T>(event: string, data: object): Promise<T> {
    return new Promise((resolve) => socket.emit(event, data, resolve))
}

// === Rejoindre une room vidéo ===
export async function joinVideoRoom(conversationId: string): Promise<JoinVideoResponse> {
    return emit<JoinVideoResponse>("join_video", {
        conversation_id: conversationId,
    })
}

// === Quitter une room vidéo ===
export function leaveVideoRoom(conversationId: string): void {
    socket.emit("leave_video", { conversation_id: conversationId })
}

// === Créer et configurer un Device MediaSoup ===
export async function createDevice(
    rtpCapabilities: MediasoupTypes.RtpCapabilities
): Promise<mediasoupClient.Device> {
    const device = new mediasoupClient.Device()
    await device.load({ routerRtpCapabilities: rtpCapabilities })
    return device
}

// === Créer un transport (send ou recv) ===
export async function createTransport(
    device: mediasoupClient.Device,
    conversationId: string,
    direction: "send" | "recv"
): Promise<MediasoupTypes.Transport> {
    // Demander au serveur de créer le transport
    const data = await emit<CreateTransportResponse>("create_transport", {
        conversation_id: conversationId,
        direction,
    })

    // Créer le transport côté client
    const transport =
        direction === "send"
            ? device.createSendTransport({
                  ...data,
                  iceServers: getIceServers(),
              })
            : device.createRecvTransport({
                  ...data,
                  iceServers: getIceServers(),
              })

    // Gérer l'événement "connect"
    transport.on("connect", async ({ dtlsParameters }, callback, errback) => {
        try {
            await emit("connect_transport", {
                conversation_id: conversationId,
                transportId: transport.id,
                dtlsParameters,
            })
            callback()
        } catch (error) {
            errback(error as Error)
        }
    })

    // Gérer l'événement "produce" (seulement pour sendTransport)
    if (direction === "send") {
        transport.on("produce", async ({ kind, rtpParameters }, callback, errback) => {
            try {
                const { id } = await emit<ProduceResponse>("produce", {
                    conversation_id: conversationId,
                    transportId: transport.id,
                    kind,
                    rtpParameters,
                })
                callback({ id })
            } catch (error) {
                errback(error as Error)
            }
        })
    }

    return transport
}

// === Produire un track (vidéo ou audio) ===
export async function produceTrack(
    transport: MediasoupTypes.Transport,
    track: MediaStreamTrack
): Promise<MediasoupTypes.Producer> {
    return transport.produce({ track })
}

// === Consommer un producer distant ===
export async function consumeProducer(
    transport: MediasoupTypes.Transport,
    device: mediasoupClient.Device,
    conversationId: string,
    producerId: string
): Promise<MediasoupTypes.Consumer | null> {
    const consumerData = await emit<ConsumeResponse>("consume", {
        conversation_id: conversationId,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
    })

    if (consumerData.error) {
        console.error("Cannot consume producer:", consumerData.error)
        return null
    }

    const consumer = await transport.consume(consumerData)

    // Reprendre le consumer (nécessaire pour certains navigateurs)
    try {
        await consumer.resume?.()
    } catch {
        // Ignorer les erreurs de resume
    }

    return consumer
}

// === Fermer un producer et notifier le serveur ===
export function closeProducer(
    conversationId: string,
    producer: MediasoupTypes.Producer
): void {
    socket.emit("close_producer", {
        conversation_id: conversationId,
        producerId: producer.id,
    })
    producer.close()
}

// === Obtenir le flux média local (caméra + micro) ===
export async function getLocalMediaStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getUserMedia({
        video: {
            width: { ideal: 1280, max: 1280 },
            height: { ideal: 720, max: 720 },
            frameRate: { ideal: 24, max: 24 },
        },
        audio: true,
    })
}

// === Obtenir le flux de partage d'écran ===
export async function getScreenShareStream(): Promise<MediaStream> {
    return navigator.mediaDevices.getDisplayMedia({
        video: {
            width: { max: 1920 },
            height: { max: 1080 },
            frameRate: { max: 5 },
        },
        audio: false,
    })
}

// === Créer un MediaStream à partir d'un track ===
export function createStreamFromTrack(track: MediaStreamTrack): MediaStream {
    const stream = new MediaStream()
    stream.addTrack(track)
    return stream
}
