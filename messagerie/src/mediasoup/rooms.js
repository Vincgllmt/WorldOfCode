import { mediaCodecs } from "./codecs.js";
import { getWorker } from "./worker.js";

const videoRooms = new Map();

export async function getOrCreateVideoRoom(conversationId) {
    const worker = getWorker();

    if (!worker) {
        throw new Error("MediaSoup worker not initialized");
    }

    if (!videoRooms.has(conversationId)) {
        const router = await worker.createRouter({ mediaCodecs });

        videoRooms.set(conversationId, {
            router,
            peers: new Map(),
        });
    }

    return videoRooms.get(conversationId);
}

// Callback appelé quand une room vidéo se vide
let _onRoomEmptyCallback = null;

/**
 * Enregistre un callback appelé quand une room vidéo se vide complètement.
 * @param {(conversationId: string) => void} cb
 */
export function onRoomEmpty(cb) {
    _onRoomEmptyCallback = cb;
}

/**
 * 🔥 CLEANUP GLOBAL PAR SOCKET
 * Supprime TOUTES les ressources MediaSoup associées à un socket
 * @param {string} socketId - ID du socket à nettoyer
 * @param {object} io - Instance Socket.IO
 * @param {string} [specificConversationId] - Si fourni, nettoie seulement cette conversation
 */
export function removePeerFromAllRooms(socketId, io, specificConversationId = null) {
    for (const [conversationId, room] of videoRooms.entries()) {
        // Si un ID spécifique est fourni, ne traiter que cette conversation
        if (specificConversationId && conversationId !== specificConversationId) continue;

        const peer = room.peers.get(socketId);
        if (!peer) continue;

        // Room Socket.IO pour la vidéo (préfixée)
        const videoRoomId = `video:${conversationId}`;

        console.log(`🧹 Cleaning up peer ${socketId} from room ${videoRoomId}`);
        console.log(`   - ${peer.producers.length} producers to close`);

        // 🔥 informer les autres peers AVANT de fermer
        peer.producers.forEach(producer => {
            console.log(`   📤 Emitting producer_closed for ${producer.id} to room ${videoRoomId}`);
            io.to(videoRoomId).emit("producer_closed", {
                producerId: producer.id,
            });
            producer.close();
        });

        peer.consumers.forEach(c => c.close());
        peer.transports.forEach(t => t.close());

        room.peers.delete(socketId);

        console.log(`   ✅ Peer removed. Remaining peers in room: ${room.peers.size}`);

        if (room.peers.size === 0) {
            console.log(`   🗑️ Room ${conversationId} is empty, deleting`);
            console.log(`   📞 _onRoomEmptyCallback is: ${_onRoomEmptyCallback ? 'SET' : 'NULL'}`);
            videoRooms.delete(conversationId);
            if (_onRoomEmptyCallback) {
                _onRoomEmptyCallback(conversationId);
            }
        }
    }
}
