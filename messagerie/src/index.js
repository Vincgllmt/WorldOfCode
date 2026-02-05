import http from "http";
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
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

const server = http.createServer();

const io = new Server(server, {
    cors: { origin: CORS_ORIGIN }
});

// État partagé pour les conversations texte
const conversations = new Map();

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

        socket.data.user = decoded;
        socket.data.userId = socket.handshake.auth?.userId;

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

    // Enregistrer les handlers de messagerie
    registerMessageHandlers(socket, io, conversations);

    // Enregistrer les handlers vidéo
    registerVideoHandlers(socket, io);

    // Gestion de la déconnexion
    socket.on("disconnect", () => {
        handleMessageDisconnect(socket, io, conversations);
        handleVideoDisconnect(socket, io);
        console.log(`❌ disconnected: ${socket.id} (user: ${userId})`);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Socket.IO server listening on http://localhost:${PORT}`);
    console.log(`CORS allowed origin: ${CORS_ORIGIN}`);
});
