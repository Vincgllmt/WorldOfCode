import type { Replay } from '@/components/arena/gameViewer'

import type { CaesarFrame, CaesarInit } from './types'

const shift = (text: string, k: number) =>
  text.replace(/[A-Z]/g, (c) => String.fromCharCode(((c.charCodeAt(0) - 65 + k + 26 * 2) % 26) + 65))

/** Parse l'entrée d'un cas : l'indice, puis le message chiffré. */
export function parseCaesar(input: string): CaesarInit {
  const lines = input.split(/\r?\n/)
  const hint = (lines[0] ?? '').trim().toUpperCase()
  const cipher = (lines[1] ?? '').replace(/\s+$/, '')
  let k = 0
  for (let j = 0; j < 26; j++) {
    if (shift(cipher, -j).includes(hint)) {
      k = j
      break
    }
  }
  return { hint, cipher, shift: k, expected: shift(cipher, -k), player: '' }
}

/** Replay figé d'une frame : la feuille chiffrée, la roue au repos. */
export function buildCaesarPreview(input: string): Replay<CaesarInit, CaesarFrame> {
  return { init: parseCaesar(input), frames: [{ event: 'start' }] }
}
