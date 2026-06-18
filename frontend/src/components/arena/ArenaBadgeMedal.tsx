'use client'

/**
 * Médaille « Code Arena » reprise du visuel d'accueil : un cadre (jante + anneau
 * + crantage) avec, au centre, la mascotte caméléon si le badge est débloqué, ou
 * un cadenas s'il est verrouillé.
 *
 * Les couleurs du cadre sont pilotées par les variables de thème :
 *   - débloqué  → dérivé de `--primary` (vert WOC, cyan/violet en cyberpunk…)
 *   - verrouillé → dérivé de `--muted` / `--border` / `--muted-foreground`
 * Seules les couleurs d'illustration de la mascotte et l'étoile d'award restent
 * fixes (ce sont des éléments décoratifs, pas du chrome thémé).
 *
 * On passe par `style={{ fill / stroke }}` plutôt que par les attributs SVG car
 * `color-mix()` / `var()` ne sont fiables qu'en CSS, pas en attribut de présentation.
 */

const TICKS: [number, number, number, number][] = [
  [120, 30, 120, 38],
  [210, 120, 202, 120],
  [120, 210, 120, 202],
  [30, 120, 38, 120],
  [56, 56, 62, 62],
  [184, 56, 178, 62],
  [184, 184, 178, 178],
  [56, 184, 62, 178],
]

/** À monter une seule fois sur la page : filtre d'ombre, symbole caméléon, keyframes. */
export function ArenaMedalDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <filter id="caShadow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="7" stdDeviation="8" floodColor="#1C5A36" floodOpacity="0.22" />
        </filter>
        <symbol id="caCham" viewBox="0 0 120 112">
          <path d="M22 72 C12 61 15 44 30 38 C30 29 37 25 45 28 C62 23 82 30 99 45 C109 52 112 58 107 64 C101 70 91 70 83 67 C69 74 47 76 37 73 C29 73 25 73 22 72 Z" fill="#5BBE74" />
          <path d="M31 41 C45 34 64 34 82 42 C70 42 52 45 41 53 C36 50 32 46 31 41 Z" fill="#46B79C" opacity="0.5" />
          <path d="M26 67 C38 74 58 75 73 70 C63 76 49 78 40 76 C33 75 28 72 26 67 Z" fill="#49AC64" />
          <path d="M48 41 C39 22 53 5 68 10 C79 13 81 26 70 29 C62 31 58 23 64 20" fill="none" stroke="#3FB7A6" strokeWidth="9.5" strokeLinecap="round" />
          <path d="M53 39 C47 24 57 13 68 17" fill="none" stroke="#F2D06A" strokeWidth="4" strokeLinecap="round" />
          <circle cx="67" cy="23" r="3.3" fill="#EBA0B6" />
          <path d="M106 63 C96 71 85 70 78 66" fill="none" stroke="#2E8A4C" strokeWidth="3.4" strokeLinecap="round" />
          <circle cx="101" cy="58" r="2.1" fill="#2E8A4C" />
          <circle cx="65" cy="52" r="17" fill="#54B56C" />
          <circle cx="65" cy="52" r="17" fill="none" stroke="#46A65E" strokeWidth="2.4" />
          <circle cx="69" cy="53" r="7.6" fill="#F4CE63" />
          <circle cx="70.5" cy="53" r="3.6" fill="#1E2B22" />
          <circle cx="72" cy="51" r="1.4" fill="#fff" />
          <circle className="ca-lid" cx="69" cy="53" r="8.4" fill="#54B56C" />
        </symbol>
      </defs>
      <style>{`
        @keyframes ca-blink{0%,90%,100%{transform:scaleY(0)}93%,96%{transform:scaleY(1)}}
        @keyframes ca-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2.2px)}}
        .ca-lid{transform-box:fill-box;transform-origin:center;animation:ca-blink 4.8s ease-in-out infinite}
        .ca-bob{transform-box:fill-box;transform-origin:center;animation:ca-bob 3.6s ease-in-out infinite}
      `}</style>
    </svg>
  )
}

type ArenaBadgeMedalProps = {
  earned: boolean
  size?: number
}

export default function ArenaBadgeMedal({ earned, size = 84 }: ArenaBadgeMedalProps) {
  // Couleurs du cadre, dérivées du thème.
  const rim = earned ? 'var(--primary)' : 'var(--border)'
  const ring = earned
    ? 'color-mix(in srgb, var(--primary) 78%, #fff)'
    : 'color-mix(in srgb, var(--border) 55%, var(--card))'
  const tint = earned ? 'color-mix(in srgb, var(--primary) 14%, var(--card))' : 'var(--muted)'
  const ticks = earned
    ? 'color-mix(in srgb, var(--primary) 45%, #fff)'
    : 'color-mix(in srgb, var(--muted-foreground) 35%, var(--card))'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      style={{ display: 'block', opacity: earned ? 1 : 0.9 }}
      role="img"
      aria-label={earned ? 'Badge débloqué' : 'Badge verrouillé'}
    >
      <g filter="url(#caShadow)">
        <circle cx="120" cy="120" r="112" style={{ fill: rim }} />
        <circle cx="120" cy="120" r="98" style={{ fill: ring }} />
        <circle cx="120" cy="120" r="84" style={{ fill: tint }} />
      </g>
      <g style={{ stroke: ticks }} strokeWidth="3.4" strokeLinecap="round">
        {TICKS.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>

      {earned ? (
        <>
          <g className="ca-bob">
            <use href="#caCham" x="58" y="64" width="124" height="116" />
          </g>
          {/* Étoile d'award (or, décoratif) */}
          <g transform="translate(120 188)">
            <circle cx="0" cy="0" r="14" fill="#fff" />
            <path
              d="M0 -8.5 L2.5 -2.8 L8.5 -2.2 L4 1.9 L5.3 7.9 L0 4.9 L-5.3 7.9 L-4 1.9 L-8.5 -2.2 L-2.5 -2.8 Z"
              fill="#F2B441"
            />
          </g>
        </>
      ) : (
        <g transform="translate(120 118)">
          <rect
            x="-26"
            y="-4"
            width="52"
            height="42"
            rx="9"
            style={{ fill: 'color-mix(in srgb, var(--muted-foreground) 42%, var(--card))' }}
          />
          <path
            d="M-16 -4 V-20 a16 16 0 0 1 32 0 V-4"
            fill="none"
            style={{ stroke: 'color-mix(in srgb, var(--muted-foreground) 28%, var(--card))' }}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  )
}
