import type { Replay } from '@/components/arena/gameViewer'

import type { Parcel, ParcelSortFrame, ParcelSortInit } from './types'

/**
 * Parse un lot de colis (même format que le referee) en état initial.
 * Format : 1re ligne « N », puis N lignes « id l w h ».
 */
export function parseParcels(input: string): ParcelSortInit {
  const lines = input.split(/\r?\n/).filter((l) => l.trim() !== '')
  const n = lines.length ? Number(lines[0].trim().split(/\s+/)[0]) : 0

  const parcels: Parcel[] = []
  for (let i = 1; i <= n && i < lines.length; i++) {
    const [id, l, w, h] = lines[i].trim().split(/\s+/).map(Number)
    parcels.push({ id, l, w, h, vol: l * w * h })
  }

  return { parcels }
}

/**
 * Replay figé d'une frame = état de départ (tous les colis dans l'aire d'arrivée,
 * tapis vide). Affiché dans la visualisation sans exécuter de code.
 */
export function buildParcelSortPreview(input: string): Replay<ParcelSortInit, ParcelSortFrame> {
  return { init: parseParcels(input), frames: [{ placed: [] }] }
}
