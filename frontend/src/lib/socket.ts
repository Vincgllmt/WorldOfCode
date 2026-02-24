import { io } from "socket.io-client"

// ⚠️ IMPORTANT : ne JAMAIS fallback sur localhost en production !
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL

if (!SOCKET_URL) {
  console.error("❌ NEXT_PUBLIC_SOCKET_URL is missing !");
}

export const socket = io(SOCKET_URL!, {
    autoConnect: false,
    path: "/api/messaging/socket.io",   // ⬅️ METS LE PATH COMPLET !
})
