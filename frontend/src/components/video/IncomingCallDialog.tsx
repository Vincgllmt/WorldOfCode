"use client"

import { useEffect, useRef, useCallback } from "react"
import { Phone, PhoneOff, Video, X } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type Props = {
    callerUsername: string
    conversationId: string
    onAccept: () => void
    onReject: () => void
    onDismiss: () => void
}

/**
 * Sonnerie tech douce — mêmes sonorités (sweeps, sub-bass, harmoniques)
 * mais avec des ondes douces (sine/triangle), gains réduits et enveloppes
 * progressives. Style notification tech élégante.
 */
function createRingtone(): { start: () => void; stop: () => void } {
    let audioCtx: AudioContext | null = null
    let intervalId: ReturnType<typeof setInterval> | null = null
    let stopped = false

    const playPulse = () => {
        if (!audioCtx || stopped) return
        const now = audioCtx.currentTime

        // === Pulse 1 : sweep doux montant (bip tech feutré) ===
        const sweep1 = audioCtx.createOscillator()
        sweep1.type = "sine"
        sweep1.frequency.setValueAtTime(500, now)
        sweep1.frequency.exponentialRampToValueAtTime(800, now + 0.12)
        const sweepGain1 = audioCtx.createGain()
        sweepGain1.gain.setValueAtTime(0, now)
        sweepGain1.gain.linearRampToValueAtTime(0.06, now + 0.03)
        sweepGain1.gain.exponentialRampToValueAtTime(0.001, now + 0.2)
        const filter1 = audioCtx.createBiquadFilter()
        filter1.type = "lowpass"
        filter1.frequency.value = 1500
        filter1.Q.value = 0.7
        sweep1.connect(filter1)
        filter1.connect(sweepGain1)
        sweepGain1.connect(audioCtx.destination)
        sweep1.start(now)
        sweep1.stop(now + 0.25)

        // === Pulse 2 : écho décalé plus aigu (double-tap doux) ===
        const sweep2 = audioCtx.createOscillator()
        sweep2.type = "sine"
        sweep2.frequency.setValueAtTime(600, now + 0.22)
        sweep2.frequency.exponentialRampToValueAtTime(950, now + 0.34)
        const sweepGain2 = audioCtx.createGain()
        sweepGain2.gain.setValueAtTime(0, now + 0.22)
        sweepGain2.gain.linearRampToValueAtTime(0.05, now + 0.25)
        sweepGain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
        const filter2 = audioCtx.createBiquadFilter()
        filter2.type = "lowpass"
        filter2.frequency.value = 1600
        filter2.Q.value = 0.7
        sweep2.connect(filter2)
        filter2.connect(sweepGain2)
        sweepGain2.connect(audioCtx.destination)
        sweep2.start(now + 0.22)
        sweep2.stop(now + 0.5)

        // === Sub-bass doux (pulsation profonde) ===
        const sub = audioCtx.createOscillator()
        sub.type = "sine"
        sub.frequency.setValueAtTime(65, now)
        sub.frequency.exponentialRampToValueAtTime(45, now + 0.3)
        const subGain = audioCtx.createGain()
        subGain.gain.setValueAtTime(0, now)
        subGain.gain.linearRampToValueAtTime(0.08, now + 0.05)
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)
        sub.connect(subGain)
        subGain.connect(audioCtx.destination)
        sub.start(now)
        sub.stop(now + 0.4)

        // === Harmonique haute (éclat doux, shimmer) ===
        const hi = audioCtx.createOscillator()
        hi.type = "triangle"
        hi.frequency.value = 1400
        const hiGain = audioCtx.createGain()
        hiGain.gain.setValueAtTime(0, now + 0.22)
        hiGain.gain.linearRampToValueAtTime(0.025, now + 0.28)
        hiGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)
        const hiFilter = audioCtx.createBiquadFilter()
        hiFilter.type = "lowpass"
        hiFilter.frequency.value = 2000
        hiFilter.Q.value = 0.5
        hi.connect(hiFilter)
        hiFilter.connect(hiGain)
        hiGain.connect(audioCtx.destination)
        hi.start(now + 0.22)
        hi.stop(now + 0.65)
    }

    const start = () => {
        try {
            stopped = false
            audioCtx = new AudioContext()
            playPulse()
            // Double-tap toutes les 2.5s (plus espacé = plus calme)
            intervalId = setInterval(playPulse, 2500)
        } catch {
            // Web Audio API non supportée
        }
    }

    const stop = () => {
        stopped = true
        if (intervalId) {
            clearInterval(intervalId)
            intervalId = null
        }
        if (audioCtx) {
            audioCtx.close().catch(() => { /* ignore */ })
            audioCtx = null
        }
    }

    return { start, stop }
}

export function IncomingCallDialog({ callerUsername, conversationId, onAccept, onReject, onDismiss }: Props) {
    const ringtoneRef = useRef<ReturnType<typeof createRingtone> | null>(null)

    // Démarrer la sonnerie au montage
    useEffect(() => {
        ringtoneRef.current = createRingtone()
        ringtoneRef.current.start()

        return () => {
            ringtoneRef.current?.stop()
            ringtoneRef.current = null
        }
    }, [])

    const handleAccept = useCallback(() => {
        ringtoneRef.current?.stop()
        onAccept()
    }, [onAccept])

    const handleReject = useCallback(() => {
        ringtoneRef.current?.stop()
        onReject()
    }, [onReject])

    const handleDismiss = useCallback(() => {
        ringtoneRef.current?.stop()
        onDismiss()
    }, [onDismiss])

    const initials = callerUsername.slice(0, 2).toUpperCase()

    return (
        <div className="fixed top-20 right-4 z-[60] animate-in slide-in-from-top-2 fade-in duration-300">
            <div className="bg-card border border-border rounded-xl shadow-2xl p-4 w-80 relative">
                {/* Bouton fermer (X) */}
                <button
                    onClick={handleDismiss}
                    className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                    title="Fermer la notification"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header avec icône vidéo */}
                <div className="flex items-center gap-3 mb-3 pr-6">
                    {/* Avatar avec pulse */}
                    <div className="relative shrink-0">
                        <div className="absolute inset-0 rounded-full bg-green-500/30 animate-pulse" />
                        <Avatar className="relative w-10 h-10">
                            <AvatarFallback className="text-sm font-bold bg-primary/20 text-primary">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    {/* Texte */}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{callerUsername}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Video className="w-3 h-3" />
                            <span>Appel vidéo entrant...</span>
                        </div>
                    </div>
                </div>

                {/* Boutons */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReject}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive hover:text-white transition-colors text-sm font-medium"
                    >
                        <PhoneOff className="w-4 h-4" />
                        Refuser
                    </button>

                    <button
                        onClick={handleAccept}
                        className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white transition-colors text-sm font-medium"
                    >
                        <Phone className="w-4 h-4" />
                        Accepter
                    </button>
                </div>
            </div>
        </div>
    )
}
