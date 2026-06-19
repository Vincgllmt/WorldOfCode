'use client'

import { useMemo } from 'react'

/**
 * Scène évolutive de la bannière niveau (Code Arena).
 *
 * Ce n'est pas un thème par palier : c'est *la même scène* qui se métamorphose
 * du niveau 1 au niveau 10 — la vallée à l'aube laisse place aux contreforts,
 * puis à la mer de nuages, à la stratosphère et enfin au cosmos. En parallèle,
 * un fil « dev » se construit : graphe de commits qui s'allume nœud par nœud et
 * fusée « ship it » qui décolle avec le niveau.
 *
 * Chaque couche est pilotée par une rampe d'opacité `ramp(a, b)` fonction du
 * niveau (1–10), de sorte que les transitions se chevauchent en douceur.
 */
export default function LevelScene({ level }: { level: number }) {
  const lvl = Math.max(1, Math.min(10, level))

  // Étoiles déterministes (pas de Math.random : stable entre les rendus / SSR).
  const stars = useMemo(() => {
    const rnd = (s: number) => {
      const x = Math.sin(s * 91.7 + 7.3) * 43758.5
      return x - Math.floor(x)
    }
    return Array.from({ length: 34 }, (_, i) => ({
      x: (rnd(i + 1) * 800).toFixed(0),
      y: (rnd(i + 5) * 120).toFixed(0),
      r: (0.6 + rnd(i + 3) * 1.6).toFixed(1),
      animationDelay: (rnd(i + 7) * 2.8).toFixed(2) + 's',
      animationDuration: (2.2 + rnd(i + 2) * 2).toFixed(2) + 's',
    }))
  }, [])

  const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
  const ramp = (a: number, b: number) => clamp01((lvl - a) / (b - a))

  // Couleurs d'accent du fil dev : vert tendre, puis cyan dans la stratosphère.
  const accent = lvl >= 7 ? '#8FE9FF' : '#A8EEBE'

  // Graphe de commits : 10 nœuds qui s'allument jusqu'au niveau courant.
  const nodes = Array.from({ length: 10 }, (_, i) => {
    const cx = 372 + i * 45
    const cy = 56 + Math.sin(i * 1.15) * 17
    const lit = i + 1 <= lvl
    return {
      cx: cx.toFixed(0),
      cy: cy.toFixed(0),
      r: lit ? 4.6 : 3,
      fill: lit ? accent : '#FFFFFF',
      fillOpacity: lit ? 0.95 : 0.22,
    }
  })
  const linkAll = nodes.map((n) => `${n.cx},${n.cy}`).join(' ')
  const linkLit = nodes
    .slice(0, lvl)
    .map((n) => `${n.cx},${n.cy}`)
    .join(' ')
  const head = nodes[lvl - 1]

  // Fusée « ship it » : décolle (monte + dérive) au fil des niveaux.
  const rocketX = ((lvl - 1) / 9) * 34
  const rocketY = ((lvl - 1) / 9) * -104

  // Opacités/transforms des couches de décor (rampes qui se chevauchent).
  const skyDuskOp = ramp(3, 5)
  const skyCosmosOp = ramp(7, 9)
  const cosmosOp = ramp(6, 9)
  const sunOp = 1 - ramp(6, 8)
  const sunY = ramp(1, 8) * 64
  const auroraOp = ramp(6, 9)
  const valleyFarOp = 0.55 * (1 - ramp(4, 6))
  const cloudsOp = ramp(3, 5) * (1 - ramp(7, 9))
  const mistOp = 1 - ramp(3, 5)
  const ridgeMidVOp = 1 - ramp(5, 8)
  const ridgeMidCOp = ramp(5, 8)
  const ridgeFrontVOp = 1 - ramp(5, 8)
  const ridgeFrontCOp = ramp(5, 8)
  const birdsOp = 1 - ramp(4, 7)
  const shootOp = ramp(7, 9)

  const fade = { transition: 'opacity .7s ease' }

  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="evDawn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0B3122" />
            <stop offset="0.55" stopColor="#15623E" />
            <stop offset="1" stopColor="#2C9159" />
          </linearGradient>
          <linearGradient id="evDusk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0A2538" />
            <stop offset="0.5" stopColor="#1C5560" />
            <stop offset="0.8" stopColor="#3E8A6E" />
            <stop offset="1" stopColor="#E0A24A" />
          </linearGradient>
          <linearGradient id="evCosmos" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#070A24" />
            <stop offset="0.6" stopColor="#0C1A3A" />
            <stop offset="1" stopColor="#10324A" />
          </linearGradient>
          <radialGradient id="evSun" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#FFE8B0" stopOpacity="0.95" />
            <stop offset="0.45" stopColor="#F4B45E" stopOpacity="0.45" />
            <stop offset="1" stopColor="#F4B45E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="evCloud" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FBE6C4" />
            <stop offset="1" stopColor="#D98E72" />
          </linearGradient>
          <radialGradient id="evNeb" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#8A4BD0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#8A4BD0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="evNeb2" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#2BB6C4" stopOpacity="0.45" />
            <stop offset="1" stopColor="#2BB6C4" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="evAur" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#3BE38A" stopOpacity="0.7" />
            <stop offset="0.6" stopColor="#36C7B0" stopOpacity="0.3" />
            <stop offset="1" stopColor="#36C7B0" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="evAur2" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0" stopColor="#7C6CF0" stopOpacity="0.55" />
            <stop offset="1" stopColor="#7C6CF0" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="evMoon" cx="0.4" cy="0.4" r="0.6">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#C9D6F0" />
          </radialGradient>
          <filter id="evBlur">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>

        {/* CIELS (fondus empilés) */}
        <rect x="0" y="0" width="800" height="200" fill="url(#evDawn)" />
        <rect x="0" y="0" width="800" height="200" fill="url(#evDusk)" style={{ opacity: skyDuskOp, ...fade }} />
        <rect x="0" y="0" width="800" height="200" fill="url(#evCosmos)" style={{ opacity: skyCosmosOp, ...fade }} />

        {/* COSMOS : nébuleuses, étoiles, lune */}
        <g style={{ opacity: cosmosOp, ...fade }}>
          <ellipse cx="560" cy="48" rx="240" ry="150" fill="url(#evNeb)" />
          <ellipse cx="180" cy="40" rx="200" ry="130" fill="url(#evNeb2)" />
          <g fill="#EAF2FF">
            {stars.map((st, i) => (
              <circle
                key={i}
                className="ev-tw"
                cx={st.x}
                cy={st.y}
                r={st.r}
                style={{ animationDelay: st.animationDelay, animationDuration: st.animationDuration }}
              />
            ))}
          </g>
          <circle cx="120" cy="50" r="40" fill="#0C1A3A" />
          <circle cx="118" cy="48" r="18" fill="url(#evMoon)" />
          <circle cx="118" cy="48" r="25" fill="#CFE0FF" opacity="0.16" filter="url(#evBlur)" />
        </g>

        {/* SOLEIL (descend + s'éteint) */}
        <g style={{ opacity: sunOp, transform: `translateY(${sunY}px)`, transition: 'opacity .7s ease, transform .8s ease' }}>
          <ellipse cx="630" cy="150" rx="250" ry="150" fill="url(#evSun)" />
          <g className="ev-rays" stroke="#FCE3A6" strokeWidth="2.4" strokeLinecap="round" opacity="0.4">
            <line x1="630" y1="150" x2="630" y2="46" />
            <line x1="630" y1="150" x2="510" y2="64" />
            <line x1="630" y1="150" x2="750" y2="68" />
            <line x1="630" y1="150" x2="470" y2="124" />
            <line x1="630" y1="150" x2="790" y2="124" />
          </g>
          <circle cx="630" cy="150" r="28" fill="#FFEFC2" />
        </g>

        {/* AURORE (cosmos) */}
        <g style={{ opacity: auroraOp, ...fade }}>
          <g className="ev-aurora" filter="url(#evBlur)">
            <path d="M-80 124 C140 56 300 134 480 66 C640 10 760 104 900 52 L900 210 L-80 210 Z" fill="url(#evAur)" />
          </g>
          <g className="ev-aurora2" filter="url(#evBlur)">
            <path d="M-80 146 C180 86 320 150 520 92 C680 48 800 124 920 82 L920 210 L-80 210 Z" fill="url(#evAur2)" />
          </g>
        </g>

        {/* VALLÉE : collines lointaines */}
        <g className="ev-driftR" style={{ opacity: valleyFarOp, ...fade }}>
          <path d="M-60 118 C140 96 300 128 470 104 C620 84 720 116 880 100 L880 210 L-60 210 Z" fill="#3C8C61" />
        </g>

        {/* MER DE NUAGES (couchant) */}
        <g style={{ opacity: cloudsOp, ...fade }}>
          <g className="ev-driftR" fill="url(#evCloud)" filter="url(#evBlur)">
            <ellipse cx="180" cy="150" rx="170" ry="20" />
            <ellipse cx="470" cy="156" rx="200" ry="22" />
            <ellipse cx="760" cy="150" rx="160" ry="18" />
          </g>
          <g className="ev-driftL" fill="#F3DEBF" filter="url(#evBlur)" opacity="0.92">
            <ellipse cx="320" cy="178" rx="220" ry="18" />
            <ellipse cx="660" cy="182" rx="190" ry="16" />
            <ellipse cx="40" cy="180" rx="150" ry="15" />
          </g>
        </g>

        {/* BRUME (vallée) */}
        <g className="ev-mist" filter="url(#evBlur)" fill="#EAF7EE" style={{ opacity: mistOp, ...fade }}>
          <ellipse cx="240" cy="150" rx="150" ry="11" opacity="0.5" />
          <ellipse cx="560" cy="158" rx="180" ry="12" opacity="0.42" />
          <ellipse cx="410" cy="146" rx="120" ry="9" opacity="0.45" />
        </g>

        {/* CRÊTE MOYENNE (recolore vallée→cosmos) */}
        <path
          d="M0 140 C160 118 330 150 500 126 C630 108 720 140 800 130 L800 210 L0 210 Z"
          fill="#1E6A45"
          style={{ opacity: ridgeMidVOp, ...fade }}
        />
        <path
          d="M0 152 L140 110 L260 146 L380 104 L500 144 L620 108 L740 146 L800 124 L800 210 L0 210 Z"
          fill="#0B2630"
          style={{ opacity: ridgeMidCOp, ...fade }}
        />

        {/* CRÊTE AVANT */}
        <path
          d="M0 168 C150 154 320 176 470 160 C620 146 720 170 800 162 L800 210 L0 210 Z"
          fill="#0E3A26"
          style={{ opacity: ridgeFrontVOp, ...fade }}
        />
        <g style={{ opacity: ridgeFrontCOp, ...fade }}>
          <path d="M0 200 L0 162 L130 110 L240 150 L360 98 L470 146 L580 106 L700 152 L800 118 L800 200 Z" fill="#05101E" />
          <path
            d="M0 162 L130 110 L240 150 L360 98 L470 146 L580 106 L700 152 L800 118"
            fill="none"
            stroke="#9BE8FF"
            strokeWidth="1.4"
            opacity="0.45"
          />
        </g>

        {/* DEV : graphe de commits qui s'allume nœud par nœud */}
        <g>
          <polyline points={linkAll} fill="none" stroke="#FFFFFF" strokeOpacity="0.16" strokeWidth="2" />
          <polyline points={linkLit} fill="none" stroke={accent} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={head.cx} cy={head.cy} r="9" fill={accent} opacity="0.22" />
          {nodes.map((nd, i) => (
            <circle key={i} cx={nd.cx} cy={nd.cy} r={nd.r} fill={nd.fill} fillOpacity={nd.fillOpacity} />
          ))}
        </g>

        {/* OISEAUX (bas niveaux) */}
        <g style={{ opacity: birdsOp, ...fade }}>
          <g className="ev-bird" fill="none" stroke="#0B2A1B" strokeWidth="2" strokeLinecap="round" opacity="0.6">
            <path d="M0 0 q5 -5 10 0 q5 -5 10 0" />
          </g>
          <g
            className="ev-bird"
            style={{ animationDelay: '-7s', animationDuration: '19s' }}
            fill="none"
            stroke="#0B2A1B"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity="0.5"
          >
            <path d="M40 24 q4 -4 8 0 q4 -4 8 0" />
          </g>
        </g>

        {/* ÉTOILE FILANTE (cosmos) */}
        <g style={{ opacity: shootOp, ...fade }}>
          <line
            className="ev-shoot"
            x1="0"
            y1="0"
            x2="46"
            y2="0"
            stroke="#EAF2FF"
            strokeWidth="2"
            strokeLinecap="round"
            transform="translate(150,26) rotate(22)"
          />
        </g>

        {/* DEV : fusée « ship it » qui décolle avec le niveau */}
        <g style={{ transform: `translate(${rocketX.toFixed(1)}px, ${rocketY.toFixed(1)}px)`, transition: 'transform .8s ease' }}>
          <g transform="translate(704 152) rotate(20)">
            <path className="ev-flame" d="M-4 9 C-3 22 3 22 4 9 C2 16 -2 16 -4 9 Z" fill="#F4B45E" />
            <path d="M0 -22 C7 -16 8 -4 6 8 L-6 8 C-8 -4 -7 -16 0 -22 Z" fill="#7FD8A0" stroke="#2E8A4C" strokeWidth="1.5" />
            <path d="M-6 8 L-12 17 L-4 11 Z" fill="#E07CA3" />
            <path d="M6 8 L12 17 L4 11 Z" fill="#3FB7A6" />
            <circle cx="0" cy="-9" r="3.4" fill="#0B3122" />
          </g>
        </g>
      </svg>

      {/* Voile de lisibilité : assombrit la gauche pour le texte blanc. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(90deg,rgba(5,16,12,.62),rgba(5,16,12,.14) 55%,rgba(5,16,12,.02))' }}
      />
    </>
  )
}
