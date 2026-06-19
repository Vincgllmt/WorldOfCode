import http from "http";
import crypto from "crypto";
import { Server } from "socket.io";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import fs from "fs";
import { initMediaSoupWorker } from "./mediasoup/worker.js";
import { registerMessageHandlers, handleMessageDisconnect } from "./handlers/messageHandlers.js";
import { registerVideoHandlers, handleVideoDisconnect } from "./handlers/videoHandlers.js";

dotenv.config();
await initMediaSoupWorker();

const PORT = process.env.PORT || 8081;
if (!process.env.CORS_ORIGIN) {
    throw new Error("CORS_ORIGIN is required (no wildcard default). Set it to the allowed origin.");
}
const CORS_ORIGIN = process.env.CORS_ORIGIN;

// SEC-14 : secret partagé backend ↔ messagerie pour authentifier /api/notify
if (!process.env.INTERNAL_SECRET) {
    throw new Error("INTERNAL_SECRET is required (shared secret backend ↔ messagerie for /api/notify).");
}
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

// Comparaison à temps constant pour éviter les attaques temporelles
function isValidInternalSecret(provided) {
    if (typeof provided !== "string") return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(INTERNAL_SECRET);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && req.url === '/api/notify') {
        // SEC-14 : refuser tout appel sans le bon secret interne
        if (!isValidInternalSecret(req.headers['x-internal-secret'])) {
            res.writeHead(401);
            res.end(JSON.stringify({ error: 'Unauthorized' }));
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                const { recipientId, notification } = JSON.parse(body);

                if (!recipientId || !notification) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Missing recipientId or notification' }));
                    return;
                }

                const recipientIdStr = String(recipientId);
                if (onlineUsers.has(recipientIdStr)) {
                    const socketIds = onlineUsers.get(recipientIdStr);
                    for (const sid of socketIds) {
                        io.to(sid).emit('new_notification', notification);
                    }
                    console.log(`🔔 Notification pushed to user ${recipientId} (${socketIds.size} socket(s))`);
                } else {
                    console.log(`🔔 User ${recipientId} offline, notification saved in DB only`);
                }

                res.writeHead(200);
                res.end(JSON.stringify({ success: true }));
            } catch (err) {
                console.error('❌ Notify endpoint error:', err);
                res.writeHead(500);
                res.end(JSON.stringify({ error: 'Internal error' }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

const io = new Server(server, {
    path: "/socket.io", // Chemin par défaut, pas besoin de le spécifier
    cors: { origin: CORS_ORIGIN }
});

// État partagé pour les conversations texte
const conversations = new Map();

// Tracking global des utilisateurs en ligne : userId → Set<socketId>
const onlineUsers = new Map();

const publicKey = fs.readFileSync("/app/src/config/jwt/public.pem", "utf8");

// Middleware d'authentification JWT
io.use((socket, next) => {
    try {
        const token =
            socket.handshake.auth?.token ||
            socket.handshake.headers?.authorization?.split(" ")[1];

        const parts = token.split(".");
        if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
            console.log("JWT exp:", payload.exp, "=>", new Date(payload.exp * 1000).toISOString());
            console.log("Now    :", new Date().toISOString());
        }
        if (!token) {
            return next(new Error("Missing authentication token"));
        }

        const decoded = jwt.verify(token, publicKey, { algorithms: ["RS256"] });

        // SEC-13 (fixé) : le userId est extrait DU JWT signé par le backend
        // (via JWTCreatedListener Symfony) et non plus de socket.handshake.auth.
        // Cette dernière source était envoyée par le client = usurpation possible.
        socket.data.user = decoded;
        socket.data.userId = decoded.userId;

        if (!socket.data.userId) {
            console.error("❌ JWT ne contient pas userId (JWTCreatedListener manquant côté backend ?)");
            return next(new Error("Invalid token payload"));
        }

        console.log(`✅ JWT valide pour ${decoded.username} (id: ${socket.data.userId})`);

        next();
    } catch (err) {
        console.error("❌ Invalid token:", err.message);
        next(new Error("Invalid or expired token"));
    }
});

// Gestion des connexions
io.on("connection", (socket) => {
    const userId = socket.data.userId;

    console.log(socket.data);
    console.log(`🔌 connected: ${socket.id} (user: ${userId})`);

    // Tracking présence globale
    if (userId) {
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);
        // Broadcast à tous que cet utilisateur est en ligne
        io.emit("user_online", { userId });

        // Rejoindre une room personnelle pour recevoir les notifications
        // (messages, etc.) même quand on n'est pas dans la conversation
        socket.join(`user:${userId}`);
    }

    // Quand un client demande la liste des utilisateurs en ligne
    socket.on("get_online_users", (cb) => {
        const ids = Array.from(onlineUsers.keys());
        if (typeof cb === "function") cb(ids);
    });

    // Enregistrer les handlers de messagerie
    registerMessageHandlers(socket, io, conversations);

    // Enregistrer les handlers vidéo
    registerVideoHandlers(socket, io);

    // Gestion de la déconnexion
    socket.on("disconnect", () => {
        // Tracking présence globale
        if (userId && onlineUsers.has(userId)) {
            onlineUsers.get(userId).delete(socket.id);
            if (onlineUsers.get(userId).size === 0) {
                onlineUsers.delete(userId);
                // Broadcast à tous que cet utilisateur est hors ligne
                io.emit("user_offline", { userId });
            }
        }

        handleMessageDisconnect(socket, io, conversations);
        handleVideoDisconnect(socket, io);
        console.log(`❌ disconnected: ${socket.id} (user: ${userId})`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Socket.IO server listening on http://localhost:${PORT}`);
    console.log(`CORS allowed origin: ${CORS_ORIGIN}`);
});
