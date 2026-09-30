export interface SudokuInit {
  /** 81 caractères, ligne par ligne : chiffre imposé ou « . ». */
  givens: string
  /** 81 caractères : grille du joueur (« . » = case absente ou invalide). */
  player: string
}

export type SudokuEvent =
  | 'start' // grille de départ
  | 'row' // une ligne de la réponse s'inscrit
  | 'passed' // grille juste
  | 'failed' // grille fausse : conflits, cases vides, indices modifiés

export interface SudokuFrame {
  event: SudokuEvent
  /** Ligne en cours d'écriture (row). */
  row?: number
  /** Indices modifiés par le joueur (failed). */
  changed?: number[]
  /** Cases laissées vides ou illisibles (failed). */
  invalid?: number[]
  /** Cases en double dans une ligne, une colonne ou un carré (failed). */
  conflicts?: number[]
  /** Nombre de lignes de chiffres écrites (failed). */
  rowsGot?: number
}
