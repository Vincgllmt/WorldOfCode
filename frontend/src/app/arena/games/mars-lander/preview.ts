import type { Replay } from '@/components/arena/gameViewer'

import type { MarsLanderFrame, MarsLanderInit } from './types'

/**
 * Parse un cas Mars Lander (même format que le referee) : surface puis état initial.
 * Format : `surfaceN`, puis `surfaceN` lignes `landX landY`, puis une ligne
 * `X Y hSpeed vSpeed fuel rotate power` (état de départ de la capsule).
 */
export function parseMarsLander(input: string): {
  init: MarsLanderInit
  start: MarsLanderFrame
} {
  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l !== '')

  const n = parseInt(lines[0]?.split(/\s+/)[0] ?? '0', 10)
  const surface: [number, number][] = []
  for (let i = 1; i <= n && i < lines.length; i++) {
    const [x, y] = lines[i].split(/\s+/).map(Number)
    surface.push([x, y])
  }

  const s = (lines[1 + n] ?? '').split(/\s+/).map(Number)
  const [x = 0, y = 0, hs = 0, vs = 0, fuel = 0, rotate = 0, power = 0] = s

  // Zone d'atterrissage = segment plat le plus large.
  let best = -1
  let landing = { x1: 0, x2: 0, y: 0 }
  for (let i = 0; i < surface.length - 1; i++) {
    const a = surface[i]
    const b = surface[i + 1]
    if (a[1] === b[1] && Math.abs(b[0] - a[0]) > best) {
      best = Math.abs(b[0] - a[0])
      landing = { x1: Math.min(a[0], b[0]), x2: Math.max(a[0], b[0]), y: a[1] }
    }
  }

  return {
    init: { width: 7000, height: 3000, gravity: 3.711, surface, landing },
    start: { time: 0, x, y, hSpeed: hs, vSpeed: vs, fuel, rotate, power },
  }
}

/**
 * Replay figé d'une frame = état de départ d'un cas (capsule au-dessus du sol),
 * affiché dans la visualisation sans exécuter de code.
 */
export function buildMarsLanderPreview(input: string): Replay<MarsLanderInit, MarsLanderFrame> {
  const { init, start } = parseMarsLander(input)
  return { init, frames: [start] }
}
