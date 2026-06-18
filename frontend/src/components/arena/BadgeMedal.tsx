'use client'

import { useState } from 'react'
import type { ArenaBadge } from '@/interfaces/arena'

/**
 * Visuels « médaille » dédiés par jeu (slug du défi). Le SVG animé embarque ses
 * propres @keyframes (donc il bouge même servi en <img>) ; le statique sert de
 * fallback si l'animé échoue au chargement.
 */
const MEDALS: Record<string, { anime: string; statique: string }> = {
  maze: { anime: '/badges/cameleon-anime.svg', statique: '/badges/cameleon-statique.svg' },
  'chameleon-colors': { anime: '/badges/cameleon-anime.svg', statique: '/badges/cameleon-statique.svg' },
}

type BadgeMedalProps = {
  badge: ArenaBadge
  size?: number
}

export default function BadgeMedal({ badge, size = 48 }: BadgeMedalProps) {
  const medal = MEDALS[badge.challengeSlug]
  // Icône propre au badge (chemin d'image dans game.json) → prioritaire sur la médaille du jeu.
  const iconPath = badge.icon && /^\/|\.(svg|png|jpe?g|webp)$/i.test(badge.icon) ? badge.icon : null
  const [src, setSrc] = useState(iconPath ?? medal?.anime ?? '')

  // Ni icône d'image ni médaille : pastille avec l'icône (emoji) du badge.
  if (!src) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }}
        title={badge.name}
        aria-label={badge.name}
      >
        {badge.icon || '🏅'}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={badge.name}
      title={badge.name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="shrink-0"
      onError={() => medal && src !== medal.statique && setSrc(medal.statique)}
    />
  )
}
