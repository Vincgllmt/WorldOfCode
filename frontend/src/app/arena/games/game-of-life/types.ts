export interface LifeInit {
  cols: number
  rows: number
  /** Nombre de générations à simuler. */
  gens: number
  /** Population à chaque génération (0..gens) : sert à tracer la courbe. */
  population?: number[]
}

export interface LifeFrame {
  /** gen = une génération de la vraie évolution ; compare = réponse du joueur confrontée. */
  event: 'gen' | 'compare'
  gen: number
  /** Cellules vivantes (index y * cols + x). */
  alive: number[]
  /** Cellules qui devaient vivre mais sont mortes chez le joueur (compare). */
  missing?: number[]
  /** Cellules vivantes chez le joueur qui devaient mourir (compare). */
  extra?: number[]
  /** Nombre de lignes écrites par le joueur (compare). */
  rowsGot?: number
  passed?: boolean
}
