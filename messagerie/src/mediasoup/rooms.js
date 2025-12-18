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

/**
 * 🔥 CLEANUP GLOBAL PAR SOCKET
 * Supprime TOUTES les ressources MediaSoup associées à un socket
 */
export function removePeerFromAllRooms(socketId, io) {
    for (const [roomId, room] of videoRooms.entries()) {
        const peer = room.peers.get(socketId);
        if (!peer) continue;

        // 🔥 informer les autres peers AVANT de fermer
        peer.producers.forEach(producer => {
            io.to(roomId).emit("producer_closed", {
                producerId: producer.id,
            });
            producer.close();
        });

        peer.consumers.forEach(c => c.close());
        peer.transports.forEach(t => t.close());

        room.peers.delete(socketId);

        if (room.peers.size === 0) {
            videoRooms.delete(roomId);
        }
    }
}
