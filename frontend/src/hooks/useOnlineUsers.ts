"use client"

import { useEffect, useState, useCallback } from "react"
import { socket } from "@/lib/socket"

/**
 * Hook qui track les utilisateurs en ligne via Socket.IO.
 * Retourne un Set d'userId en ligne + un helper isOnline(userId).
 */
export function useOnlineUsers() {
    const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set())

    useEffect(() => {
        // Demander la liste initiale des utilisateurs en ligne
        if (socket.connected) {
            socket.emit("get_online_users", (ids: number[]) => {
                setOnlineUserIds(new Set(ids.map(Number)))
            })
        }

        const onConnect = () => {
            socket.emit("get_online_users", (ids: number[]) => {
                setOnlineUserIds(new Set(ids.map(Number)))
            })
        }

        const onUserOnline = ({ userId }: { userId: number }) => {
            setOnlineUserIds((prev) => {
                const next = new Set(prev)
                next.add(Number(userId))
                return next
            })
        }

        const onUserOffline = ({ userId }: { userId: number }) => {
            setOnlineUserIds((prev) => {
                const next = new Set(prev)
                next.delete(Number(userId))
                return next
            })
        }

        socket.on("connect", onConnect)
        socket.on("user_online", onUserOnline)
        socket.on("user_offline", onUserOffline)

        return () => {
            socket.off("connect", onConnect)
            socket.off("user_online", onUserOnline)
            socket.off("user_offline", onUserOffline)
        }
    }, [])

    const isOnline = useCallback(
        (userId: number | undefined) => {
            if (!userId) return false
            return onlineUserIds.has(Number(userId))
        },
        [onlineUserIds]
    )

    return { onlineUserIds, isOnline }
}
