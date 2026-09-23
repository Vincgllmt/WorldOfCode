import type { Graphics } from 'pixi.js'

/**
 * Petite boîte à outils partagée par les viewers de jeux : interpolation, courbes
 * d'accélération, aléatoire déterministe et peintres de dégradés / halos.
 *
 * Tout est pur (aucun état) : un viewer peut redessiner sa scène à l'identique à
 * chaque redimensionnement en repartant de la même graine.
 */

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

/** Portion [from, to] de la progression t, ramenée sur 0→1 (pour enchaîner des phases). */
export const phase = (t: number, from: number, to: number) => clamp01((t - from) / Math.max(1e-6, to - from))

export const smooth = (t: number) => t * t * (3 - 2 * t)
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
export const easeInCubic = (t: number) => t * t * t
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
/** Léger dépassement puis retour : donne du « pop » à une apparition. */
export const easeOutBack = (t: number) => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/** Mélange linéaire de deux couleurs 0xRRGGBB. */
export function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff
  const ag = (a >> 8) & 0xff
  const ab = a & 0xff
  const br = (b >> 16) & 0xff
  const bg = (b >> 8) & 0xff
  const bb = b & 0xff
  return (
    (Math.round(lerp(ar, br, t)) << 16) | (Math.round(lerp(ag, bg, t)) << 8) | Math.round(lerp(ab, bb, t))
  )
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) : même graine → même décor. */
export function rng(seed: number): () => number {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let r = Math.imul(s ^ (s >>> 15), 1 | s)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Halo lumineux : anneaux concentriques empilés dont l'opacité suit la dérivée
 * d'une décroissance quadratique — leur superposition donne un dégradé continu.
 */
export function glowInto(g: Graphics, x: number, y: number, r: number, color: number, alpha: number) {
  const RINGS = 22
  for (let i = RINGS; i >= 1; i--) {
    const u = i / RINGS
    g.circle(x, y, r * u).fill({ color, alpha: (alpha * 2 * (1 - u)) / RINGS })
  }
}

/** Dégradé vertical par bandes fines (suffisamment nombreuses pour paraître continu). */
export function verticalGradient(
  g: Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  top: number,
  bottom: number,
  bands = 48,
) {
  const step = h / bands
  for (let i = 0; i < bands; i++) {
    // +1 px de recouvrement : évite les fines coutures entre bandes à l'antialiasing.
    g.rect(x, y + i * step, w, step + 1).fill(mixColor(top, bottom, i / (bands - 1)))
  }
}
