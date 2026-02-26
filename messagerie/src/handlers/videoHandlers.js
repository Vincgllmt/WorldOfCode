import { getOrCreateVideoRoom, removePeerFromAllRooms, onRoomEmpty } from "../mediasoup/rooms.js";
import { createWebRtcTransport } from "../mediasoup/transports.js";
import { pool } from "../db.js";
import crypto from "crypto";

// Map pour suivre les appels en attente : conversationId → { callerId, callerSocketId, callerUsername, timeout }
const pendingCalls = new Map();

// Map pour suivre les appels actifs (connectés) : conversationId → { startedAt, callerId }
const activeCalls = new Map();

// Référence io pour le callback onRoomEmpty
let _io = null;
let _roomEmptyRegistered = false;

/**
 * Sauvegarde un message "Appel vidéo" quand la room se vide (1 seul message par appel)
 */
async function saveCallEndMessage(conversationId) {
    const callData = activeCalls.get(conversationId);
    if (!callData) return;

    activeCalls.delete(conversationId);

    const duration = Math.round((Date.now() - callData.startedAt) / 1000);
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const durationStr = mins > 0
        ? `${mins}min ${secs.toString().padStart(2, "0")}s`
        : `${secs}s`;

    const body = `Appel vidéo — ${durationStr}`;
    const id = crypto.randomUUID();
    const created = new Date();

    try {
        await pool.execute(
            `INSERT INTO msg_messages (id, conversation_id, sender_id, body, type, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [id, conversationId, callData.callerId, body, "call", created]
        );

        await pool.execute(
            `UPDATE msg_conversations SET last_message_at = ? WHERE id = ?`,
            [created, conversationId]
        );

        const payload = {
            id,
            conversation_id: conversationId,
            sender_id: callData.callerId,
            body,
            type: "call",
            created_at: created.toISOString(),
        };

        if (_io) {
            _io.to(conversationId).emit("message_created", payload);
        }
    } catch (err) {
        console.error("❌ saveCallEndMessage error:", err);
    }
}

/**
 * Gestion des handlers vidéo (MediaSoup)
 */
export function registerVideoHandlers(socket, io) {
    _io = io;

    if (!_roomEmptyRegistered) {
        _roomEmptyRegistered = true;
        onRoomEmpty((conversationId) => saveCallEndMessage(conversationId));
    }

    // ─── Signalisation d'appel ───

    // À la connexion, vérifier si un appel entrant est en attente pour cet utilisateur
    const connectedUserId = Number(socket.data.userId);
    (async () => {
        for (const [convId, pending] of pendingCalls.entries()) {
            // Chercher si cet utilisateur est le destinataire d'un appel en attente
            // (l'appelant est pending.callerId, donc si connectedUserId !== callerId, c'est le destinataire)
            if (pending.callerId !== connectedUserId) {
                // Vérifier que cet utilisateur est bien participant de cette conversation
                try {
                    const [parts] = await pool.execute(
                        "SELECT user_id FROM msg_conversation_participants WHERE conversation_id = ? AND user_id = ?",
                        [convId, connectedUserId]
                    );
                    if (parts.length > 0) {
                        console.log(`📞 Re-sending incoming_call to reconnected user ${connectedUserId} for conv ${convId}`);
                        socket.emit("incoming_call", {
                            conversation_id: convId,
                            callerId: pending.callerId,
                            callerUsername: pending.callerUsername,
                        });
                    }
                } catch (err) {
                    console.error("❌ Error checking pending calls on reconnect:", err);
                }
            }
        }
    })();

    // L'appelant initie un appel → notifier le destinataire
    socket.on("call_initiate", async ({ conversation_id }, cb) => {
        const callerId = Number(socket.data.userId);
        const callerUsername = socket.data.user?.username || "Utilisateur";

        try {
            const [participants] = await pool.execute(
                "SELECT user_id FROM msg_conversation_participants WHERE conversation_id = ?",
                [conversation_id]
            );

            const targetUserId = participants
                .map(p => Number(p.user_id))
                .find(id => id !== callerId);

            if (!targetUserId) {
                return cb?.({ error: "no_target_user" });
            }

            const allSockets = await io.fetchSockets();
            const targetSockets = allSockets.filter(
                s => Number(s.data.userId) === targetUserId
            );

            if (targetSockets.length === 0) {
                return cb?.({ error: "user_offline" });
            }

            const timeoutId = setTimeout(async () => {
                if (pendingCalls.has(conversation_id)) {
                    pendingCalls.delete(conversation_id);
                    socket.emit("call_timeout", { conversation_id });
                    const socks = await io.fetchSockets();
                    socks.filter(s => Number(s.data.userId) === targetUserId)
                        .forEach(s => s.emit("call_cancelled", { conversation_id }));
                }
            }, 30000);

            pendingCalls.set(conversation_id, {
                callerId,
                callerSocketId: socket.id,
                callerUsername,
                timeoutId,
            });

            // Envoyer incoming_call au destinataire
            for (const s of targetSockets) {
                s.emit("incoming_call", {
                    conversation_id,
                    callerId,
                    callerUsername,
                });
            }

            cb?.({ success: true });
        } catch (err) {
            console.error("❌ call_initiate error:", err);
            cb?.({ error: "server_error" });
        }
    });

    // Le destinataire accepte
    socket.on("call_accept", ({ conversation_id }) => {
        const pending = pendingCalls.get(conversation_id);
        if (!pending) return;

        clearTimeout(pending.timeoutId);

        // Tracker le début de l'appel pour calculer la durée quand la room se videra
        activeCalls.set(conversation_id, {
            startedAt: Date.now(),
            callerId: pending.callerId,
        });

        pendingCalls.delete(conversation_id);

        // Notifier l'appelant
        const callerSocket = io.sockets.sockets.get(pending.callerSocketId);
        if (callerSocket) {
            callerSocket.emit("call_accepted", { conversation_id });
        }
    });

    // Le destinataire refuse
    socket.on("call_reject", ({ conversation_id }) => {
        const pending = pendingCalls.get(conversation_id);
        if (!pending) return;

        clearTimeout(pending.timeoutId);
        pendingCalls.delete(conversation_id);

        const callerSocket = io.sockets.sockets.get(pending.callerSocketId);
        if (callerSocket) {
            callerSocket.emit("call_rejected", { conversation_id });
        }
    });

    // L'appelant annule avant que le destinataire réponde
    socket.on("call_cancel", async ({ conversation_id }) => {
        const pending = pendingCalls.get(conversation_id);
        if (!pending) return;

        clearTimeout(pending.timeoutId);
        pendingCalls.delete(conversation_id);

        const callerId = Number(socket.data.userId);
        try {
            const [participants] = await pool.execute(
                "SELECT user_id FROM msg_conversation_participants WHERE conversation_id = ?",
                [conversation_id]
            );
            const targetUserId = participants
                .map(p => Number(p.user_id))
                .find(id => id !== callerId);

            if (targetUserId) {
                const allSockets = await io.fetchSockets();
                allSockets.filter(s => Number(s.data.userId) === targetUserId)
                    .forEach(s => s.emit("call_cancelled", { conversation_id }));
            }
        } catch (err) {
            console.error("❌ call_cancel error:", err);
        }
    });

    // ─── Handlers MediaSoup existants ───

    // Rejoindre un appel vidéo
    socket.on("join_video", async ({ conversation_id }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);

        // Utiliser une room séparée pour la vidéo (préfixée avec "video:")
        const videoRoomId = `video:${conversation_id}`;
        socket.join(videoRoomId);

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

        cb({
            rtpCapabilities: room.router.rtpCapabilities,
            existingProducers,
        });
    });

    // Connecter un transport WebRTC
    socket.on("connect_transport", async ({ conversation_id, transportId, dtlsParameters }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);
        const peer = room.peers.get(socket.id);

        if (!peer) {
            return cb({ error: "peer_not_found" });
        }

        const transport = peer.transports.find(t => t.id === transportId);
        if (!transport) {
            return cb({ error: "transport_not_found" });
        }

        await transport.connect({ dtlsParameters });
        cb({ success: true });
    });

    // Produire un flux média (audio/vidéo)
    socket.on("produce", async ({ conversation_id, transportId, kind, rtpParameters }, cb) => {
        const room = await getOrCreateVideoRoom(conversation_id);
        const peer = room.peers.get(socket.id);

        if (!peer) {
            return cb({ error: "peer_not_found" });
        }

        const transport = peer.transports.find(t => t.id === transportId);
        const producer = await transport.produce({ kind, rtpParameters });

        peer.producers.push(producer);

        const videoRoomId = `video:${conversation_id}`;

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
        let peer = room.peers.get(socket.id);

        // Si le peer n'existe pas encore (race condition), le créer
        if (!peer) {
            peer = { transports: [], producers: [], consumers: [] };
            room.peers.set(socket.id, peer);
            const videoRoomId = `video:${conversation_id}`;
            socket.join(videoRoomId);
        }

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

    // Fermer un producer spécifique (ex: arrêt partage d'écran)
    socket.on("close_producer", async ({ conversation_id, producerId }) => {
        try {
            const room = await getOrCreateVideoRoom(conversation_id);
            const peer = room.peers.get(socket.id);
            if (!peer) return;

            const producerIndex = peer.producers.findIndex(p => p.id === producerId);
            if (producerIndex === -1) return;

            const producer = peer.producers[producerIndex];
            producer.close();
            peer.producers.splice(producerIndex, 1);

            const videoRoomId = `video:${conversation_id}`;
            socket.to(videoRoomId).emit("producer_closed", { producerId });
        } catch {
            // silently ignore
        }
    });

    // Quitter un appel vidéo sans se déconnecter du socket
    socket.on("leave_video", ({ conversation_id }) => {
        if (!conversation_id) return;

        const videoRoomId = `video:${conversation_id}`;
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
