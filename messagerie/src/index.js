import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";

dotenv.config();

const PORT = process.env.PORT || 8081;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const server = http.createServer();

const io = new Server(server, {
    cors: { origin: CORS_ORIGIN }
});

// In-memory room tracking (for presence)
const conversations = new Map();

// TODO: remplacer par un JWT
io.use((socket, next) => {
    const userId =
        socket.handshake.auth?.userId || socket.handshake.query?.userId;
    if (!userId) {
        socket.data.userId = `guest:${socket.id}`;
    } else {
        socket.data.userId = String(userId);
    }
    return next();
});

io.on("connection", (socket) => {
    const userId = socket.data.userId;
    console.log(`🔌 connected: ${socket.id} (user: ${userId})`);

    /**
     * --- SIMPLE CHAT GLOBAL ---
     * pour les test à supprimer
     */
    socket.on("chat_message", ({ user, text }) => {
        if (!text) return;
        console.log(`💬 [GLOBAL] ${user}: ${text}`);
        io.emit("chat_message", { user, text });
    });

    /**
     * --- CONVERSATION MODE (ROOMS) ---
     */
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

    socket.on("send_message", ({ conversation_id, temp_id, body, type }) => {
        if (!conversation_id || !body) return;

        const payload = {
            id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            conversation_id,
            sender_id: userId,
            body,
            type: type || "text",
            created_at: new Date().toISOString(),
        };

        socket.emit("ack", { temp_id, ...payload });

        // broadcast to the room
        io.to(conversation_id).emit("message_created", payload);
    });

    socket.on("typing", ({ conversation_id, is_typing }) => {
        if (!conversation_id) return;
        socket.to(conversation_id).emit("typing", {
            conversation_id,
            user_id: userId,
            is_typing: Boolean(is_typing),
        });
    });

    /**
     * --- PING TEST ---
     */
    socket.on("ping_app", () => socket.emit("pong_app", { now: Date.now() }));

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
