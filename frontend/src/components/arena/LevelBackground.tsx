'use client'

import dynamic from 'next/dynamic'

import {
  backgroundForLevel,
  backgroundKind,
  backgroundSrc,
} from '@/lib/level-backgrounds'

// Le runtime Rive n'est chargé que si un fond `.riv` est réellement affiché.
const RiveBackground = dynamic(() => import('./RiveBackground'), { ssr: false })

// SVG animé inliné côté client uniquement (fetch + injection du markup).
const InlineSvgBackground = dynamic(() => import('./InlineSvgBackground'), { ssr: false })

interface LevelBackgroundProps {
  level: number
  /** Affiche le motif de points par-dessus le fond (comme le bandeau d'origine). */
  dots?: boolean
  className?: string
}

/**
 * Couche de fond plein cadre d'un bandeau de niveau, format-agnostique.
 *
 * Empilement (du bas vers le haut) :
 *   1. dégradé de base (toujours présent → jamais de vide ni de flash)
 *   2. média optionnel selon l'extension : Rive / vidéo / image
 *   3. motif de points optionnel
 *
 * À poser en premier enfant d'un conteneur `relative overflow-hidden`. Le
 * contenu du bandeau reste au-dessus (z-index naturel des éléments suivants).
 */
export default function LevelBackground({ level, dots = true, className }: LevelBackgroundProps) {
  const bg = backgroundForLevel(level)
  const kind = backgroundKind(bg.file)
  const src = bg.file ? backgroundSrc(bg.file) : undefined

  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`} aria-hidden>
      {/* 1. Dégradé de base */}
      <div className="absolute inset-0" style={{ backgroundImage: bg.gradient }} />

      {/* 2. Média par-dessus le dégradé */}
      {kind === 'image' && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      )}

      {kind === 'svg' && src && (
        <div className="absolute inset-0">
          <InlineSvgBackground src={src} />
        </div>
      )}

      {kind === 'video' && src && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={src}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {kind === 'rive' && src && (
        <div className="absolute inset-0">
          <RiveBackground src={src} />
        </div>
      )}

      {/* 3. Motif de points */}
      {dots && (
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,.13) 1px, transparent 1px)',
            backgroundSize: '18px 18px',
          }}
        />
      )}
    </div>
  )
}
