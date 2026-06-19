'use client'

import { useState } from 'react'

/**
 * Médaille d'un jeu (par slug du défi). Le SVG animé embarque ses propres
 * @keyframes (donc il bouge même servi en <img>) ; le statique sert de fallback
 * si l'animé échoue au chargement.
 *
 * Les couleurs sont FIXES, propres au badge — jamais dérivées du thème. Un badge
 * verrouillé est simplement grisé/atténué (traitement fixe, sans variable de thème).
 */
const MEDALS: Record<string, { anime: string; statique: string }> = {
  maze: { anime: '/badges/cameleon-anime.svg', statique: '/badges/cameleon-statique.svg' },
  'mars-lander': {
    anime: '/badges/mars-lander-anime.svg',
    statique: '/badges/mars-lander-statique.svg',
  },
}

type BadgeMedalProps = {
  /** Slug du défi : choisit le visuel de médaille. */
  slug: string
  /** Libellé (title / aria-label). */
  name: string
  /** Emoji de repli si aucun visuel dédié pour le slug. */
  icon?: string | null
  /** Débloqué ? Si false → médaille grisée. */
  earned?: boolean
  size?: number
}

export default function BadgeMedal({ slug, name, icon, earned = true, size = 48 }: BadgeMedalProps) {
  const medal = MEDALS[slug]
  const [src, setSrc] = useState(medal?.anime ?? '')

  // Verrouillé : désaturé + atténué (couleurs fixes, indépendantes du thème).
  const lockedStyle = earned ? undefined : { filter: 'grayscale(1)', opacity: 0.4 }

  // Pas de visuel dédié au slug : si l'icône du badge est un chemin d'image
  // (ex. /badges/cameleon-fraise-or.svg), on l'affiche en <img> ; sinon emoji.
  if (!medal) {
    const isImagePath = !!icon && (icon.startsWith('/') || /\.(svg|png|jpe?g|webp|gif)$/i.test(icon))
    if (isImagePath) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={icon as string}
          alt={name}
          title={name}
          width={size}
          height={size}
          style={{ width: size, height: size, ...lockedStyle }}
          className="shrink-0"
        />
      )
    }
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size * 0.5),
          background: 'rgba(148,163,184,0.16)',
          color: '#64748b',
          ...lockedStyle,
        }}
        title={name}
        aria-label={name}
      >
        {icon || '🏅'}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      title={name}
      width={size}
      height={size}
      style={{ width: size, height: size, ...lockedStyle }}
      className="shrink-0"
      onError={() => medal && src !== medal.statique && setSrc(medal.statique)}
    />
  )
}
