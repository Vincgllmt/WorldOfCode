'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Code, Users, MessageCircle, Video } from 'lucide-react'
import LandingNavbar from '@/components/landing/LandingNavbar'

const ROLES = ['développeurs', 'devops', 'designers', 'data scientists', 'freelances', 'étudiants']

const slides = [
    {
        icon: <Code className="w-10 h-10 text-green-600" />,
        title: "Fil d'actualit\u00e9",
        description: "Partagez vos connaissances, postez du code et \u00e9changez avec la communaut\u00e9 des d\u00e9veloppeurs."
    },
    {
        icon: <Users className="w-10 h-10 text-green-600" />,
        title: "Groupes technologiques",
        description: "Rejoignez des groupes React, Symfony, Docker, AWS et bien d'autres pour approfondir vos comp\u00e9tences."
    },
    {
        icon: <MessageCircle className="w-10 h-10 text-green-600" />,
        title: "Messagerie temps r\u00e9el",
        description: "Discutez en priv\u00e9 avec les autres d\u00e9veloppeurs instantan\u00e9ment gr\u00e2ce \u00e0 notre messagerie int\u00e9gr\u00e9e."
    },
    {
        icon: <Video className="w-10 h-10 text-green-600" />,
        title: "Appels vid\u00e9o & partage d'\u00e9cran",
        description: "Collaborez en live avec la vid\u00e9o et le partage d'\u00e9cran pour r\u00e9soudre des probl\u00e8mes ensemble."
    },
]

// === Réseau de nodes interactif ===
interface Node {
    x: number
    y: number
    vx: number
    vy: number
    radius: number
    baseX: number
    baseY: number
}

const NODE_COUNT = 85
const CONNECTION_DIST = 200
const MOUSE_RADIUS = 220
const MOUSE_REPEL = 0.6

function useNetworkEffect(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
    const nodesRef = useRef<Node[]>([])
    const mouseRef = useRef({ x: -9999, y: -9999 })
    const animRef = useRef<number>(0)

    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        const resize = () => {
            canvas.width = window.innerWidth
            canvas.height = window.innerHeight
            if (nodesRef.current.length === 0) {
                initNodes(canvas.width, canvas.height)
            }
        }

        const initNodes = (w: number, h: number) => {
            nodesRef.current = Array.from({ length: NODE_COUNT }, () => {
                const x = Math.random() * w
                const y = Math.random() * h
                return {
                    x,
                    y,
                    baseX: x,
                    baseY: y,
                    vx: (Math.random() - 0.5) * 0.3,
                    vy: (Math.random() - 0.5) * 0.3,
                    radius: 1.5 + Math.random() * 2,
                }
            })
        }

        resize()
        window.addEventListener('resize', resize)

        const animate = () => {
            if (!ctx || !canvas) return
            ctx.clearRect(0, 0, canvas.width, canvas.height)

            const nodes = nodesRef.current
            const mouse = mouseRef.current

            for (const node of nodes) {
                node.x += node.vx
                node.y += node.vy
                node.vx += (node.baseX - node.x) * 0.0003
                node.vy += (node.baseY - node.y) * 0.0003
                node.vx *= 0.99
                node.vy *= 0.99

                const dx = node.x - mouse.x
                const dy = node.y - mouse.y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < MOUSE_RADIUS && dist > 0) {
                    const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_REPEL
                    node.vx += (dx / dist) * force
                    node.vy += (dy / dist) * force
                }

                if (node.x < 0) { node.x = 0; node.vx *= -0.5 }
                if (node.x > canvas.width) { node.x = canvas.width; node.vx *= -0.5 }
                if (node.y < 0) { node.y = 0; node.vy *= -0.5 }
                if (node.y > canvas.height) { node.y = canvas.height; node.vy *= -0.5 }
            }

            const getColor = (y: number, alpha: number) => {
                const t = Math.min(1, Math.max(0, y / canvas.height))
                const r = Math.round(187 - t * (187 - 21))
                const g = Math.round(247 - t * (247 - 128))
                const b = Math.round(208 - t * (208 - 61))
                return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(4)})`
            }

            for (let i = 0; i < nodes.length; i++) {
                for (let j = i + 1; j < nodes.length; j++) {
                    const dx = nodes[i].x - nodes[j].x
                    const dy = nodes[i].y - nodes[j].y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < CONNECTION_DIST) {
                        const opacity = (1 - dist / CONNECTION_DIST) * 0.55
                        const midY = (nodes[i].y + nodes[j].y) / 2
                        ctx.beginPath()
                        ctx.moveTo(nodes[i].x, nodes[i].y)
                        ctx.lineTo(nodes[j].x, nodes[j].y)
                        ctx.strokeStyle = getColor(midY, opacity)
                        ctx.lineWidth = 1.5
                        ctx.stroke()
                    }
                }
            }

            if (mouse.x > 0 && mouse.y > 0) {
                for (const node of nodes) {
                    const dx = node.x - mouse.x
                    const dy = node.y - mouse.y
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < MOUSE_RADIUS) {
                        const opacity = (1 - dist / MOUSE_RADIUS) * 0.5
                        const midY = (node.y + mouse.y) / 2
                        ctx.beginPath()
                        ctx.moveTo(node.x, node.y)
                        ctx.lineTo(mouse.x, mouse.y)
                        ctx.strokeStyle = getColor(midY, opacity)
                        ctx.lineWidth = 1.2
                        ctx.stroke()
                    }
                }
            }

            for (const node of nodes) {
                const gradient = ctx.createRadialGradient(
                    node.x, node.y, 0,
                    node.x, node.y, node.radius * 3
                )
                gradient.addColorStop(0, getColor(node.y, 0.5))
                gradient.addColorStop(1, getColor(node.y, 0))
                ctx.beginPath()
                ctx.arc(node.x, node.y, node.radius * 4, 0, Math.PI * 2)
                ctx.fillStyle = gradient
                ctx.fill()

                ctx.beginPath()
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
                ctx.fillStyle = getColor(node.y, 0.85)
                ctx.fill()
            }

            animRef.current = requestAnimationFrame(animate)
        }

        animate()

        return () => {
            window.removeEventListener('resize', resize)
            cancelAnimationFrame(animRef.current)
        }
    }, [canvasRef])

    const handleMouseMove = useCallback((x: number, y: number) => {
        mouseRef.current = { x, y }
    }, [])

    const handleMouseLeave = useCallback(() => {
        mouseRef.current = { x: -9999, y: -9999 }
    }, [])

    return { handleMouseMove, handleMouseLeave }
}

export default function LandingPage() {
    const [current, setCurrent] = useState(0)
    const [roleIndex, setRoleIndex] = useState(0)
    const [fadeIn, setFadeIn] = useState(true)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const { handleMouseMove, handleMouseLeave } = useNetworkEffect(canvasRef)

    useEffect(() => {
        const interval = setInterval(() => {
            setFadeIn(false)
            setTimeout(() => {
                setRoleIndex((prev) => (prev + 1) % ROLES.length)
                setFadeIn(true)
            }, 300)
        }, 2500)
        return () => clearInterval(interval)
    }, [])

    const next = useCallback(() => {
        setCurrent((prev) => (prev + 1) % slides.length)
    }, [])

    const prev = useCallback(() => {
        setCurrent((prev) => (prev - 1 + slides.length) % slides.length)
    }, [])

    useEffect(() => {
        const interval = setInterval(next, 5000)
        return () => clearInterval(interval)
    }, [next])

    const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        handleMouseMove(e.clientX, e.clientY)
    }, [handleMouseMove])

    return (
        <div
            onMouseMove={onMouseMove}
            onMouseLeave={handleMouseLeave}
            className="h-screen flex flex-col overflow-hidden relative bg-gradient-to-b from-green-300 via-green-100 to-white"
        >
            {/* Canvas réseau en arrière-plan */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 pointer-events-none z-0"
            />

            {/* Navbar Landing modernisée */}
            <div className="relative z-10">
                <LandingNavbar />
            </div>

            {/* Contenu principal */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 gap-8">
                {/* Hero */}
                <div className="text-center max-w-2xl mx-auto">
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                        Rejoignez la communauté des
                        <br />
                        <span
                            className={`inline-block text-green-600 transition-all duration-300 ${
                                fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                            }`}
                        >
                            {ROLES[roleIndex]}
                        </span>
                        <br />
                        qui partagent leur passion
                    </h1>
                    <p className="text-gray-600 text-base sm:text-lg max-w-xl mx-auto mb-8">
                        Apprenez, collaborez et partagez vos connaissances en temps réel.
                    </p>
                    <div className="flex items-center justify-center gap-4">
                        <Link href="/register">
                            <Button
                                size="lg"
                                className="bg-green-600 hover:bg-green-700 text-white text-base px-8 shadow-lg shadow-green-600/25 rounded-full"
                            >
                                Rejoindre la communaut&eacute;
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Carrousel features */}
                <div id="features" className="w-full max-w-xl relative">
                    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-md border border-green-100 p-6 text-center min-h-[150px] flex flex-col items-center justify-center">
                        <div className="mb-3 bg-green-50 rounded-full p-3 inline-flex">
                            {slides[current].icon}
                        </div>
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                            {slides[current].title}
                        </h3>
                        <p className="text-gray-600 text-sm sm:text-base max-w-lg">
                            {slides[current].description}
                        </p>
                    </div>

                    {/* Flèches */}
                    <button
                        onClick={prev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 transition-colors border border-green-100"
                        aria-label="Slide précédente"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white shadow-md rounded-full p-2 transition-colors border border-green-100"
                        aria-label="Slide suivante"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </button>

                    {/* Dots */}
                    <div className="flex justify-center gap-2 mt-3">
                        {slides.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrent(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    index === current
                                        ? 'bg-green-600 w-6'
                                        : 'bg-green-200 hover:bg-green-300'
                                }`}
                                aria-label={`Aller au slide ${index + 1}`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Community anchor (pour le lien nav) */}
            <div id="community" />
        </div>
    )
}
