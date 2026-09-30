import type { Replay } from '@/components/arena/gameViewer'

import type { SudokuFrame, SudokuInit } from './types'

/** Parse l'entrée d'un cas : 9 lignes de 9 caractères (chiffre ou « . »). */
export function parseSudoku(input: string): SudokuInit {
  const rows = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== '')
  let givens = ''
  for (let r = 0; r < 9; r++) {
    const row = (rows[r] ?? '').slice(0, 9).padEnd(9, '.')
    givens += row.replace(/[^1-9]/g, '.')
  }
  return { givens, player: '.'.repeat(81) }
}

/** Replay figé d'une frame : la grille du maître, avant toute réponse. */
export function buildSudokuPreview(input: string): Replay<SudokuInit, SudokuFrame> {
  return { init: parseSudoku(input), frames: [{ event: 'start' }] }
}
