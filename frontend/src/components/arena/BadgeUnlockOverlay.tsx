'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { ArenaBadge } from '@/interfaces/arena'
import BadgeMedal from './BadgeMedal'

/**
 * Overlay plein écran célébrant la réussite de tous les tests d'un jeu : le badge
 * apparaît en grand au centre. L'animation d'entrée est tirée au hasard parmi
 * quatre styles. Un clic en dehors du badge (ou Échap) ferme l'overlay.
 */

const VARIANTS = ['pop', 'reveal', 'celebration', 'stamp'] as const
type UnlockVariant = (typeof VARIANTS)[number]
const pickVariant = (): UnlockVariant => VARIANTS[Math.floor(Math.random() * VARIANTS.length)]

const CONFETTI_COLORS = ['#22C55E', '#FACC15', '#38BDF8', '#F472B6', '#A78BFA', '#FB923C']

type BadgeUnlockOverlayProps = {
  /** Badge à célébrer ; `null` ferme l'overlay (avec animation de sortie). */
  badge: ArenaBadge | null
  /** `true` si un badge est réellement attribué (sinon : simple réussite des tests). */
  unlocked?: boolean
  onClose: () => void
}

/** Props framer-motion du badge selon la variante (et le mode mouvement réduit). */
function badgeMotion(variant: UnlockVariant, reduced: boolean) {
  if (reduced) {
    return {
      initial: { opacity: 0, scale: 0.96 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.96, transition: { duration: 0.2 } },
      transition: { duration: 0.2 },
    }
  }
  switch (variant) {
    case 'pop':
      return {
        initial: { opacity: 0, scale: 0.2, rotate: -12 },
        animate: { opacity: 1, scale: 1, rotate: 0 },
        exit: { opacity: 0, scale: 0.7, transition: { duration: 0.2 } },
        transition: { type: 'spring' as const, stiffness: 320, damping: 17, mass: 0.7 },
      }
    case 'reveal':
      return {
        initial: { opacity: 0, scale: 0.82, filter: 'grayscale(1) blur(12px) brightness(0.55)' },
        animate: { opacity: 1, scale: 1, filter: 'grayscale(0) blur(0px) brightness(1)' },
        exit: { opacity: 0, scale: 0.9, transition: { duration: 0.25 } },
        transition: { duration: 0.75, ease: 'easeOut' as const },
      }
    case 'celebration':
      return {
        initial: { opacity: 0, scale: 0.3 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.7, transition: { duration: 0.2 } },
        transition: { type: 'spring' as const, stiffness: 260, damping: 13 },
      }
    case 'stamp':
      return {
        initial: { opacity: 0, scale: 2.6, y: -280 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.85, transition: { duration: 0.2 } },
        transition: { type: 'spring' as const, stiffness: 700, damping: 22, mass: 1.1 },
      }
  }
}

export default function BadgeUnlockOverlay({ badge, unlocked = true, onClose }: BadgeUnlockOverlayProps) {
  const reduced = useReducedMotion() ?? false
  const [mounted, setMounted] = useState(false)
  const [size, setSize] = useState(300)

  // L'identité d'une apparition : régénère variante + confettis à chaque réussite.
  const key = badge?.awardedAt ?? null

  // Variante tirée AU MOMENT de l'apparition, pendant le rendu (pas dans un effet) :
  // l'animation d'entrée (framer-motion) lit la variante au montage du badge ; si on
  // la posait dans un useEffect, l'entrée démarrait avec l'ancienne valeur (toujours
  // « pop »). On suit la clé précédente pour ne re-tirer qu'à chaque nouvelle ouverture.
  const [variant, setVariant] = useState<UnlockVariant>(pickVariant)
  const [prevKey, setPrevKey] = useState<string | null>(key)
  if (key !== prevKey) {
    setPrevKey(key)
    if (key) setVariant(pickVariant())
  }

  useEffect(() => setMounted(true), [])

  // Taille du badge adaptée au viewport (≈ 60 % du plus petit côté, plafonné).
  useEffect(() => {
    const calc = () =>
      setSize(Math.min(320, Math.round(Math.min(window.innerWidth, window.innerHeight) * 0.6)))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  // Fermeture au clavier (Échap).
  useEffect(() => {
    if (!badge) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [badge, onClose])

  // Particules de confettis (régénérées à chaque apparition via la clé).
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }, () => {
        const angle = Math.random() * Math.PI * 2
        const dist = 130 + Math.random() * 230
        return {
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          s: 6 + Math.random() * 10,
          rot: Math.random() * 720 - 360,
          color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
          delay: Math.random() * 0.08,
          round: Math.random() > 0.5,
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  )

  if (!mounted) return null

  const showHalo = variant === 'pop' || variant === 'celebration'
  const showConfetti = variant === 'celebration' && !reduced
  const showSweep = variant === 'reveal' && !reduced
  const m = badgeMotion(variant, reduced)

  return createPortal(
    <AnimatePresence>
      {badge && (
        <motion.div
          key="badge-unlock"
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-7 overflow-hidden bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={`Badge débloqué : ${badge.name}`}
        >
          {/* Confettis projetés depuis le centre de l'écran */}
          {showConfetti && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {particles.map((p, i) => (
                  <motion.div
                    key={i}
                    className="absolute left-0 top-0"
                    style={{
                      width: p.s,
                      height: p.s,
                      backgroundColor: p.color,
                      borderRadius: p.round ? '9999px' : '2px',
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
                    animate={{ x: p.dx, y: p.dy, scale: 1, opacity: [1, 1, 0], rotate: p.rot }}
                    transition={{ duration: 1.1, delay: p.delay, ease: 'easeOut' }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Badge (seul élément qui ne ferme pas l'overlay au clic) */}
          <motion.div
            className="relative flex items-center justify-center"
            style={{ width: size, height: size }}
            onClick={(e) => e.stopPropagation()}
            {...m}
          >
            {/* Halo lumineux pulsé derrière le badge */}
            {showHalo && !reduced && (
              <motion.div
                className="pointer-events-none absolute inset-0 m-auto rounded-full"
                style={{
                  width: size * 1.6,
                  height: size * 1.6,
                  background:
                    'radial-gradient(circle, rgba(250,204,21,0.45) 0%, rgba(34,197,94,0.25) 40%, rgba(0,0,0,0) 70%)',
                }}
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: [1, 1.12, 1], opacity: [0.55, 0.85, 0.55] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
              />
            )}

            <BadgeMedal slug={badge.challengeSlug} name={badge.name} icon={badge.icon} size={size} />

            {/* Balayage de lumière « révélation » */}
            {showSweep && (
              <motion.div
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-full"
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ delay: 0.7, duration: 0.3 }}
              >
                <motion.div
                  className="absolute top-0 h-full w-1/2 -skew-x-12 mix-blend-screen"
                  style={{
                    background:
                      'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0) 100%)',
                  }}
                  initial={{ left: '-60%' }}
                  animate={{ left: '120%' }}
                  transition={{ duration: 0.8, ease: 'easeInOut' }}
                />
              </motion.div>
            )}
          </motion.div>

          {/* Légende */}
          <motion.div
            className="px-6 text-center"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: reduced ? 0 : 0.35, duration: 0.4 }}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-amber-300">
              {unlocked ? 'Badge débloqué !' : 'Tous les niveaux réussis !'}
            </p>
            <p className="mt-1 text-2xl font-bold text-white drop-shadow">{badge.name}</p>
            <p className="mt-3 text-xs text-white/60">Clique n&apos;importe où pour fermer</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
