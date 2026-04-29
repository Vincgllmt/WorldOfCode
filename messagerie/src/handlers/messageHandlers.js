import { pool } from "../db.js";
import crypto from "crypto";

/**
 * Gestion des handlers de messagerie (texte)
 */
export function registerMessageHandlers(socket, io, conversations) {
    const userId = socket.data.userId;

    // Rejoindre une conversation
    socket.on("join_conversation", ({ conversation_id }) => {
        if (!conversation_id) return;
        socket.join(conversation_id);

        if (!conversations.has(conversation_id)) {
            conversations.set(conversation_id, new Set());
        }
        conversations.get(conversation_id).add(socket.id);

        io.to(conversation_id).emit("presence", {
            conversation_id,
            user_id: userId,
            status: "joined",
        });
    });

    // Quitter une conversation
    socket.on("leave_conversation", ({ conversation_id }) => {
        if (!conversation_id) return;
        socket.leave(conversation_id);
        conversations.get(conversation_id)?.delete(socket.id);

        io.to(conversation_id).emit("presence", {
            conversation_id,
            user_id: userId,
            status: "left",
        });
    });

    // Envoyer un message
    socket.on("send_message", async ({ conversation_id, temp_id, body, type }) => {
        console.log("📨 [1] send_message received:", body);
        try {
            if (!conversation_id || !body) {
                console.log("📨 [X] Missing conversation_id or body");
                return;
            }

            const senderId = Number(userId);
            console.log("📨 [2] senderId:", senderId);
            if (!Number.isInteger(senderId)) {
                console.log("📨 [X] Invalid senderId");
                socket.emit("ack", { temp_id, error: "unauthorized_user" });
                return;
            }

            console.log("📨 [3] Checking participant...");
            const [rows] = await pool.execute(
                "SELECT 1 FROM msg_conversation_participants WHERE conversation_id=? AND user_id=? LIMIT 1",
                [conversation_id, senderId]
            );
            console.log("📨 [4] Participant check result:", rows.length);
            if (rows.length === 0) {
                console.log("📨 [X] Not in conversation");
                socket.emit("ack", { temp_id, error: "not_in_conversation" });
                return;
            }

            const id = crypto.randomUUID();
            const created = new Date();
            console.log("📨 [5] Inserting message:", id);

            // Insérer le message
            await pool.execute(
                `INSERT INTO msg_messages (id, conversation_id, sender_id, body, type, created_at)
                VALUES (?, ?, ?, ?, ?, ?)`,
                [id, conversation_id, senderId, body, type || "text", created]
            );
            console.log("📨 [6] Message inserted OK");

            // Mettre à jour la dernière date du message de la conversation
            await pool.execute(
                `UPDATE msg_conversations SET last_message_at = ? WHERE id = ?`,
                [created, conversation_id]
            );
            console.log("📨 [7] Conversation updated OK");

            const payload = {
                id,
                conversation_id,
                sender_id: senderId,
                body,
                type: type || "text",
                created_at: created.toISOString(),
            };

            socket.emit("ack", { temp_id, ...payload });
            console.log("📨 [8] Emitting message_created to room:", conversation_id);
            io.to(conversation_id).emit("message_created", payload);

            // Diffuser aussi aux rooms personnelles de chaque participant
            // pour qu'ils reçoivent l'event même hors de la conversation (notifs).
            const [participants] = await pool.execute(
                "SELECT user_id FROM msg_conversation_participants WHERE conversation_id = ?",
                [conversation_id]
            );
            for (const p of participants) {
                if (Number(p.user_id) === senderId) continue; // pas pour l'expéditeur
                io.to(`user:${p.user_id}`).emit("message_created", payload);
            }
            console.log("📨 [9] Done! Notified", participants.length - 1, "users via personal rooms");
        } catch (err) {
            console.error("📨 [ERROR] send_message error:", err);
            socket.emit("ack", { temp_id, error: "db_insert_failed" });
        }
    });

    // Indicateur de frappe
    socket.on("typing", ({ conversation_id, is_typing }) => {
        if (!conversation_id) return;
        socket.to(conversation_id).emit("typing", {
            conversation_id,
            user_id: userId,
            is_typing: Boolean(is_typing),
        });
    });
}

/**
 * Cleanup lors de la déconnexion (partie messagerie)
 */
export function handleMessageDisconnect(socket, io, conversations) {
    const userId = socket.data.userId;

    for (const [convId, set] of conversations.entries()) {
        if (set.has(socket.id)) {
            set.delete(socket.id);
            io.to(convId).emit("presence", {
                conversation_id: convId,
                user_id: userId,
                status: "left",
            });
        }
    }
}
