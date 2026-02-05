import { getOrCreateVideoRoom, removePeerFromAllRooms } from "../mediasoup/rooms.js";
import { createWebRtcTransport } from "../mediasoup/transports.js";

/**
 * Gestion des handlers vidéo (MediaSoup)
 */
export function registerVideoHandlers(socket, io) {
    // Rejoindre un appel vidéo
    socket.on("join_video", async ({ conversation_id }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);

        // Utiliser une room séparée pour la vidéo (préfixée avec "video:")
        const videoRoomId = `video:${conversation_id}`;
        socket.join(videoRoomId);
        console.log(`🎥 ${socket.id} joined video room ${videoRoomId}`);

        room.peers.set(socket.id, {
            transports: [],
            producers: [],
            consumers: [],
        });

        // Récupérer les producers existants
        const existingProducers = [];
        for (const [peerId, peer] of room.peers.entries()) {
            if (peerId === socket.id) continue;

            for (const producer of peer.producers) {
                existingProducers.push(producer.id);
            }
        }

        console.log(`🎥 ${socket.id} joined video room ${conversation_id} (${existingProducers.length} existing producers)`);

        cb({
            rtpCapabilities: room.router.rtpCapabilities,
            existingProducers,
        });
    });

    // Connecter un transport WebRTC
    socket.on("connect_transport", async ({ conversation_id, transportId, dtlsParameters }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);
        const peer = room.peers.get(socket.id);

        const transport = peer.transports.find(t => t.id === transportId);
        if (!transport) {
            console.error(`❌ Transport ${transportId} not found`);
            return cb({ error: "transport_not_found" });
        }

        await transport.connect({ dtlsParameters });
        console.log(`✅ Transport ${transportId} connected`);
        cb({ success: true });
    });

    // Produire un flux média (audio/vidéo)
    socket.on("produce", async ({ conversation_id, transportId, kind, rtpParameters }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);
        const peer = room.peers.get(socket.id);

        const transport = peer.transports.find(t => t.id === transportId);
        const producer = await transport.produce({ kind, rtpParameters });

        peer.producers.push(producer);

        // Room Socket.IO pour la vidéo (préfixée)
        const videoRoomId = `video:${conversation_id}`;
        console.log(`🎥 Producer created: ${producer.id} (${kind}) by ${socket.id} in room ${videoRoomId}`);

        // Broadcast à tous SAUF l'émetteur (vers la room vidéo)
        socket.to(videoRoomId).emit("new_producer", {
            producerId: producer.id,
            peerId: socket.id,
        });

        cb({ id: producer.id });
    });

    // Créer un transport WebRTC
    socket.on("create_transport", async ({ conversation_id, direction }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);
        const peer = room.peers.get(socket.id);

        const transport = await createWebRtcTransport(room.router);

        // Tag indispensable
        transport.appData = { direction };

        peer.transports.push(transport);

        cb({
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        });
    });

    // Consommer un flux média distant
    socket.on("consume", async ({ conversation_id, producerId, rtpCapabilities }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);
        const peer = room.peers.get(socket.id);

        if (!peer) {
            return cb({ error: "peer_not_found" });
        }

        // Vérifier que le router peut consommer
        if (!room.router.canConsume({ producerId, rtpCapabilities })) {
            console.error("❌ Cannot consume producer", producerId);
            return cb({ error: "cannot_consume" });
        }

        // Récupérer le transport de réception
        const transport = peer.transports.find(t => t.appData?.direction === "recv");

        if (!transport) {
            return cb({ error: "recv_transport_not_found" });
        }

        const consumer = await transport.consume({
            producerId,
            rtpCapabilities,
            paused: false,
        });

        peer.consumers.push(consumer);

        cb({
            id: consumer.id,
            producerId,
            kind: consumer.kind,
            rtpParameters: consumer.rtpParameters,
        });
    });

    // Quitter un appel vidéo sans se déconnecter du socket
    socket.on("leave_video", ({ conversation_id }) => {
        if (!conversation_id) return;

        const videoRoomId = `video:${conversation_id}`;
        console.log(`🎥 ${socket.id} leaving video room ${videoRoomId}`);
        removePeerFromAllRooms(socket.id, io, conversation_id);
        socket.leave(videoRoomId);
    });
}

/**
 * Cleanup lors de la déconnexion (partie vidéo)
 */
export function handleVideoDisconnect(socket, io) {
    removePeerFromAllRooms(socket.id, io);
}
