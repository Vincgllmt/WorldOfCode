'use client'

import { useState, useEffect, useCallback, useRef, useContext } from 'react'
import { useForm } from 'react-hook-form'
import { AdminAuthContext } from '@/contexts/AdminAuthContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { LoginCredentials } from '@/interfaces/Authentification'
import { Eye, EyeOff, ShieldCheck, KeyRound } from 'lucide-react'

// ─── Canvas réseau interactif (repris du frontend) ──────────────────────────

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

    const initNodes = (w: number, h: number) => {
      nodesRef.current = Array.from({ length: NODE_COUNT }, () => {
        const x = Math.random() * w
        const y = Math.random() * h
        return {
          x, y, baseX: x, baseY: y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 1.5 + Math.random() * 2,
        }
      })
    }

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      if (nodesRef.current.length === 0) initNodes(canvas.width, canvas.height)
    }

    resize()
    window.addEventListener('resize', resize)

    const getColor = (y: number, alpha: number) => {
      const t = Math.min(1, Math.max(0, y / (canvas?.height ?? 1)))
      const r = Math.round(187 - t * (187 - 21))
      const g = Math.round(247 - t * (247 - 128))
      const b = Math.round(208 - t * (208 - 61))
      return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(4)})`
    }

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

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.55
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = getColor((nodes[i].y + nodes[j].y) / 2, opacity)
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
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(mouse.x, mouse.y)
            ctx.strokeStyle = getColor((node.y + mouse.y) / 2, opacity)
            ctx.lineWidth = 1.2
            ctx.stroke()
          }
        }
      }

      for (const node of nodes) {
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3)
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

// ─── Page connexion admin ────────────────────────────────────────────────────

export default function AdminLoginPage() {
  const {
    register: registerCreds,
    handleSubmit: handleCredSubmit,
    formState: { errors: credErrors },
  } = useForm<LoginCredentials>()

  const {
    register: register2FA,
    handleSubmit: handle2FASubmit,
    formState: { errors: errors2FA },
  } = useForm<{ code: string }>()

  const auth = useContext(AdminAuthContext)
  const [showPassword, setShowPassword] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { handleMouseMove, handleMouseLeave } = useNetworkEffect(canvasRef)

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    handleMouseMove(e.clientX, e.clientY)
  }, [handleMouseMove])

  const onSubmitCredentials = async (data: LoginCredentials) => {
    await auth?.login(data)
  }

  const onSubmit2FA = async ({ code }: { code: string }) => {
    await auth?.verify2FA(code)
  }

  // ── Vue 2FA ────────────────────────────────────────────────────────────────
  if (auth?.twoFAPending) {
    return (
      <div
        onMouseMove={onMouseMove}
        onMouseLeave={handleMouseLeave}
        className="h-screen flex items-center justify-center bg-gradient-to-b from-green-300 via-green-100 to-white relative overflow-hidden"
      >
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

        <div className="relative z-10 w-full max-w-sm px-4">
          {/* Branding */}
          <div className="flex flex-col items-center mb-8 gap-2">
            <div className="w-12 h-12 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/30">
              <KeyRound className="w-6 h-6 text-white" />
            </div>
            <p className="text-sm font-medium text-green-700 tracking-widest uppercase">
              Vérification en deux étapes
            </p>
          </div>

          {/* Card */}
          <div className="bg-white/75 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl shadow-green-200/40 p-8">
            <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
              Un code a été envoyé à{' '}
              <span className="font-semibold text-gray-800">{auth.twoFAPending.maskedEmail}</span>.
              Saisissez-le ci-dessous.
            </p>

            <form onSubmit={handle2FASubmit(onSubmit2FA)} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="code" className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Code de vérification
                </Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="123456"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-[0.5em] h-14 bg-white/80"
                  {...register2FA('code', { required: 'Code requis' })}
                />
                {errors2FA.code && (
                  <p className="text-xs text-red-500 mt-1">{errors2FA.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={auth?.isLoading}
                className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium shadow-md shadow-green-600/25"
              >
                {auth?.isLoading ? 'Vérification...' : 'Confirmer'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // ── Vue principale ─────────────────────────────────────────────────────────
  return (
    <div
      onMouseMove={onMouseMove}
      onMouseLeave={handleMouseLeave}
      className="h-screen flex items-center justify-center bg-gradient-to-b from-green-300 via-green-100 to-white relative overflow-hidden"
    >
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Branding */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-600/30">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900 tracking-tight">World of Code</h1>
            <p className="text-xs font-medium text-green-700 tracking-widest uppercase mt-0.5">
              Espace Administrateur
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/75 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl shadow-green-200/40 p-8">
          <form onSubmit={handleCredSubmit(onSubmitCredentials)} className="space-y-5">
            {/* Username */}
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-semibold tracking-wide text-gray-500 uppercase"
              >
                Identifiant
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                autoComplete="username"
                className="bg-white/80 h-11"
                {...registerCreds('username', { required: 'Champ requis' })}
              />
              {credErrors.username && (
                <p className="text-xs text-red-500">{credErrors.username.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold tracking-wide text-gray-500 uppercase"
              >
                Mot de passe
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="bg-white/80 h-11 pr-10"
                  {...registerCreds('password', { required: 'Mot de passe requis' })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {credErrors.password && (
                <p className="text-xs text-red-500">{credErrors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={auth?.isLoading}
              className="w-full h-11 bg-green-600 hover:bg-green-700 text-white font-medium shadow-md shadow-green-600/25 mt-2"
            >
              {auth?.isLoading ? 'Connexion...' : 'Se connecter'}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Accès réservé aux administrateurs
        </p>
      </div>
    </div>
  )
}
