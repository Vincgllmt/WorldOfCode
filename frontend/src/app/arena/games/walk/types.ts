export interface WalkInit {
  /** Nombre de pas séparant le caméléon de la fraise. */
  distance: number
}

export interface WalkFrame {
  /** Nombre de pas déjà faits (0 = point de départ). */
  pos: number
  event?: 'walk' | 'goal' | 'miss' | 'unknown'
}
