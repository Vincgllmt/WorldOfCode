export interface StaircaseInit {
  /** Nombre de marches. */
  n: number
  /** Lignes écrites par le joueur (tronquées), affichées dans le terminal du viewer. */
  lines: string[]
}

export type StaircaseEvent =
  | 'start' // plan vide
  | 'row' // une rangée correcte posée
  | 'wrong' // rangée incorrecte
  | 'missing' // rangée manquante
  | 'extra' // ligne en trop après la dernière rangée
  | 'climb' // l'ouvrier grimpe
  | 'flag' // drapeau planté au sommet

export interface StaircaseFrame {
  /** Rangée traitée (1 = celle du haut, n = celle du bas). */
  row: number
  event: StaircaseEvent
  /** Ligne écrite par le joueur pour cette rangée. */
  got?: string
}
