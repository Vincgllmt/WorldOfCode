import type { IceServer } from "@/interfaces/video"

/**
 * Configuration des serveurs ICE (STUN/TURN)
 * STUN : permet de découvrir l'IP publique
 * TURN : relais pour traverser les NAT/firewalls stricts
 */
export const iceServers: IceServer[] = [
    // Serveurs STUN Google (gratuits)
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
]

/**
 * Retourne la configuration ICE complète
 * Peut être étendu pour ajouter des serveurs TURN en production
 */
export function getIceServers(): IceServer[] {
    return iceServers
}
