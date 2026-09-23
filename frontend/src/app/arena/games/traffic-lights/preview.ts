import type { Replay } from '@/components/arena/gameViewer'

import type { TrafficFrame, TrafficInit } from './types'

/** Parse l'entrée d'un cas : « N » puis N couleurs (une par ligne). */
export function parseTraffic(input: string): TrafficInit {
  const tokens = input.split(/\s+/).filter((s) => s !== '')
  const n = Math.max(0, Number(tokens[0]) || 0)
  return { lights: tokens.slice(1, 1 + n).map((c) => c.toUpperCase()) }
}

/** Replay figé d'une frame : la voiture au départ, tous les feux visibles. */
export function buildTrafficPreview(input: string): Replay<TrafficInit, TrafficFrame> {
  return { init: parseTraffic(input), frames: [{ light: -1, event: 'start' }] }
}
