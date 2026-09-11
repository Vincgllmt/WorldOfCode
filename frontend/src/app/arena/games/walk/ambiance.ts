/**
 * Ambiances lumineuses de la promenade.
 *
 * Le moment de la journée est déduit de la **distance** du cas de test : plus la
 * fraise est loin, plus la journée avance. Chaque cas du jeu a donc son propre ciel
 * (et toujours le même, puisque la règle est déterministe), ce qui donne quatre
 * tableaux différents à traverser sans rien changer au référé ni aux tests.
 */

/** Interpolation linéaire entre deux couleurs 0xRRGGBB. */
export function mix(a: number, b: number, t: number): number {
  const ch = (c: number, shift: number) => (c >> shift) & 255
  const r = Math.round(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * t)
  const g = Math.round(ch(a, 8) + (ch(b, 8) - ch(a, 8)) * t)
  const bl = Math.round((a & 255) + ((b & 255) - (a & 255)) * t)
  return (r << 16) | (g << 8) | bl
}

/** Teintes du caméléon : elles suivent la lumière ambiante. */
export interface ChameleonSkin {
  skin: number
  belly: number
  crest: number
  spot: number
  eye: number
}

export interface Ambiance {
  /** Nom lisible, affiché dans le HUD du viewer. */
  name: string
  /** Ciel, du zénith (top) à l'horizon (haze), en passant par mid puis warm. */
  sky: { top: number; mid: number; warm: number; haze: number }
  /** L'astre : position en fraction de l'écran, rayon en fraction de la hauteur. */
  light: { core: number; ray: number; x: number; y: number; r: number; halo: number; rayAlpha: number }
  /** Vrai la nuit : l'astre devient une lune (disque froid, sans rayons chauds). */
  moon: boolean
  /** Nombre d'étoiles semées dans le haut du ciel (0 = aucune). */
  stars: number
  /** Reliefs lointains, du plus flou au plus net. */
  ridge: { far: number; mid: number; near: number; pine: number }
  /** Ce qu'on devine en contrebas de la branche. */
  under: { top: number; mid: number; bottom: number; mist: number }
  cloud: { body: number; rim: number; alpha: number }
  wood: { bark: number; light: number; dark: number; moss: number; mossDark: number }
  foliage: { leaf: number; dark: number; light: number; vine: number }
  /** Poussières en suspension — ou lucioles quand `blink` est vrai. */
  mote: { color: number; alpha: number; size: number; blink: boolean }
  cham: ChameleonSkin
  /** Force du vignettage : on assombrit moins les bords en plein jour. */
  vignette: number
}

/** Aube : la brume n'est pas encore levée, le soleil rase depuis la gauche. */
const AUBE: Ambiance = {
  name: 'Aube',
  sky: { top: 0x2c2f5e, mid: 0xb4708f, warm: 0xffb98a, haze: 0xffd9b8 },
  light: { core: 0xffd7a8, ray: 0xffc39a, x: 0.19, y: 0.3, r: 0.04, halo: 0.62, rayAlpha: 0.045 },
  moon: false,
  stars: 16,
  ridge: { far: 0x9aa4c2, mid: 0x6c7f93, near: 0x40595c, pine: 0x2d454b },
  under: { top: 0x8ba394, mid: 0x4a6a5c, bottom: 0x22382e, mist: 0xffe3d0 },
  cloud: { body: 0x6b5570, rim: 0xffc6a0, alpha: 0.78 },
  wood: { bark: 0x7a5540, light: 0xbb8f74, dark: 0x3a2620, moss: 0x6a9a72, mossDark: 0x477a5c },
  foliage: { leaf: 0x4e8f6b, dark: 0x2a5a49, light: 0x86c39a, vine: 0x336b55 },
  mote: { color: 0xffe6cf, alpha: 0.5, size: 1, blink: false },
  cham: { skin: 0x6fae74, belly: 0xd9dfa8, crest: 0x3f7a55, spot: 0xf0c98a, eye: 0xf6d98a },
  vignette: 0.014,
}

/** Plein jour : ciel franc, verts saturés — l'ambiance de la couverture du jeu. */
const PLEIN_JOUR: Ambiance = {
  name: 'Plein jour',
  sky: { top: 0x2f7fc0, mid: 0x74c2e6, warm: 0xd6eef4, haze: 0xf1faf5 },
  light: { core: 0xfffdf0, ray: 0xfff6d8, x: 0.74, y: 0.17, r: 0.032, halo: 0.48, rayAlpha: 0.03 },
  moon: false,
  stars: 0,
  ridge: { far: 0x8fc2b0, mid: 0x5aa07f, near: 0x35785a, pine: 0x276a4a },
  under: { top: 0x66bd7b, mid: 0x33804f, bottom: 0x164a2f, mist: 0xe8fff2 },
  cloud: { body: 0xc4d9e4, rim: 0xffffff, alpha: 0.9 },
  wood: { bark: 0x9a6a3e, light: 0xd8a566, dark: 0x4d2e17, moss: 0x63b455, mossDark: 0x3f8a3f },
  foliage: { leaf: 0x54b566, dark: 0x2b7a48, light: 0x9fe081, vine: 0x347a4c },
  mote: { color: 0xffffff, alpha: 0.3, size: 0.9, blink: false },
  cham: { skin: 0x63c063, belly: 0xe6f2a8, crest: 0x2f8f4c, spot: 0xffd76b, eye: 0xffd257 },
  vignette: 0.010,
}

/** Heure dorée : fin d'après-midi, lumière rasante et chaude. */
const HEURE_DOREE: Ambiance = {
  name: 'Heure dorée',
  sky: { top: 0x16465e, mid: 0x2f8189, warm: 0xe9b063, haze: 0xf3d79e },
  light: { core: 0xfff6d5, ray: 0xffe6a8, x: 0.79, y: 0.24, r: 0.032, halo: 0.72, rayAlpha: 0.05 },
  moon: false,
  stars: 0,
  ridge: { far: 0x82b09c, mid: 0x53886f, near: 0x336151, pine: 0x24513f },
  under: { top: 0x529468, mid: 0x2a5a3f, bottom: 0x122c1e, mist: 0xcfe8d8 },
  cloud: { body: 0x37596e, rim: 0xffd6a0, alpha: 0.82 },
  wood: { bark: 0x8a5733, light: 0xc48d51, dark: 0x422713, moss: 0x5ca354, mossDark: 0x3a7639 },
  foliage: { leaf: 0x49a05c, dark: 0x235f3b, light: 0x8ed07a, vine: 0x2f6b45 },
  mote: { color: 0xfff0c2, alpha: 0.4, size: 1, blink: false },
  cham: { skin: 0x59ab5e, belly: 0xdce89a, crest: 0x2c7a46, spot: 0xffc963, eye: 0xffcf4d },
  vignette: 0.015,
}

/** Nuit étoilée : lune froide, lucioles, et les repères dorés pour seul balisage. */
const NUIT: Ambiance = {
  name: 'Nuit étoilée',
  sky: { top: 0x070d24, mid: 0x122647, warm: 0x2b3f66, haze: 0x3d4f70 },
  light: { core: 0xf4f6ff, ray: 0xcfe0ff, x: 0.76, y: 0.15, r: 0.042, halo: 0.5, rayAlpha: 0.018 },
  moon: true,
  stars: 90,
  ridge: { far: 0x3a4d6b, mid: 0x25364f, near: 0x172436, pine: 0x101a29 },
  under: { top: 0x24445f, mid: 0x142d43, bottom: 0x091626, mist: 0x9fc0e0 },
  cloud: { body: 0x1a2a44, rim: 0x7f9ac4, alpha: 0.62 },
  wood: { bark: 0x4a3626, light: 0x7a5c41, dark: 0x1c1109, moss: 0x2f5c46, mossDark: 0x1e4030 },
  foliage: { leaf: 0x27553f, dark: 0x14301f, light: 0x3d7a55, vine: 0x1c4634 },
  mote: { color: 0xc8ff8a, alpha: 0.95, size: 1.4, blink: true },
  cham: { skin: 0x3d7a55, belly: 0x8fa87a, crest: 0x27563a, spot: 0xa8d98a, eye: 0xffe08a },
  vignette: 0.026,
}

/**
 * Choisit l'ambiance d'après la distance à parcourir.
 * Les quatre cas du jeu (3, 5, 9 puis 16 pas) tombent ainsi sur quatre ciels
 * différents, et une promenade plus longue se fera toujours plus tard dans la journée.
 */
export function pickAmbiance(distance: number): Ambiance {
  if (distance <= 4) return AUBE
  if (distance <= 7) return PLEIN_JOUR
  if (distance <= 12) return HEURE_DOREE
  return NUIT
}
