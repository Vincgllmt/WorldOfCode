import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { pool } from "./db.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";

dotenv.config();

const PORT = process.env.PORT || 8081;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const server = http.createServer();

const io = new Server(server, {
    cors: { origin: CORS_ORIGIN }
});


const conversations = new Map();

import fs from "fs";
console.log("/app/src/config/jwt/public.pem");
const publicKey = fs.readFileSync("/app/src/config/jwt/public.pem", "utf8");



io.use((socket, next) => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(" ")[1];

        if (!token) {
            return next(new Error("Missing authentication token"));
        }

        const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

        // ✅ tu stockes à la fois le username (JWT) et l’id (du handshake)
        socket.data.user = decoded;
        socket.data.userId = socket.handshake.auth?.userId;

        console.log(`✅ JWT valide pour ${decoded.username} (id: ${socket.data.userId})`);

        next();
    } catch (err) {
        console.error("❌ Invalid token:", err.message);
        next(new Error("Invalid or expired token"));
    }
});



io.on("connection", (socket) => {
    const userId = socket.data.userId;


    console.log(socket.data);

    console.log(`🔌 connected: ${socket.id} (user: ${userId})`);


    /**
     * --- CONVERSATION MODE (2 users) ---
     */

    // TODO: permet de recevoir les présences (qui est en ligne dans la conv).
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
    // TODO: permet de recevoir les présences (qui est en ligne dans la conv).
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

    // --- PERSIST MESSAGE ---
    socket.on("send_message", async ({ conversation_id, temp_id, body, type }) => {
        console.log(body)
        try {
            if (!conversation_id || !body) return;

            const senderId = Number(userId);
            if (!Number.isInteger(senderId)) {
                socket.emit("ack", { temp_id, error: "unauthorized_user" });
                return;
            }

            const [rows] = await pool.execute(
                "SELECT 1 FROM msg_conversation_participants WHERE conversation_id=? AND user_id=? LIMIT 1",
                [conversation_id, senderId]
            );
            if (rows.length === 0) {
                socket.emit("ack", { temp_id, error: "not_in_conversation" });
                return;
            }

            const id = crypto.randomUUID();
            const created = new Date();

            // Insérer le message
            await pool.execute(
                `INSERT INTO msg_messages (id, conversation_id, sender_id, body, type, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
                [id, conversation_id, senderId, body, type || "text", created]
            );

            // Mettre à jour la dernière date du message de la conversation
            await pool.execute(
                `UPDATE msg_conversations SET last_message_at = ? WHERE id = ?`,
                [created, conversation_id]
            );

            const payload = {
                id,
                conversation_id,
                sender_id: senderId,
                body,
                type: type || "text",
                created_at: created.toISOString(),
            };

            socket.emit("ack", { temp_id, ...payload });
            io.to(conversation_id).emit("message_created", payload);
        } catch (err) {
            console.error("send_message error:", err);
            socket.emit("ack", { temp_id, error: "db_insert_failed" });
        }
    });


    // TODO: permet de voir quand uhn utilisateur écrit 
    socket.on("typing", ({ conversation_id, is_typing }) => {
        if (!conversation_id) return;
        socket.to(conversation_id).emit("typing", {
            conversation_id,
            user_id: userId,
            is_typing: Boolean(is_typing),
        });
    });


    socket.on("disconnect", () => {
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
        console.log(`❌ disconnected: ${socket.id} (user: ${userId})`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Socket.IO server listening on http://localhost:${PORT}`);
    console.log(`CORS allowed origin: ${CORS_ORIGIN}`);
});
