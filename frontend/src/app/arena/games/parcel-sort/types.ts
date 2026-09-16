export interface Parcel {
  id: number
  l: number
  w: number
  h: number
  vol: number
}

export interface ParcelSortInit {
  parcels: Parcel[]
}

export interface ParcelSortFrame {
  /** Ids déjà posés sur le tapis, dans l'ordre choisi par le joueur (gauche→droite). */
  placed: number[]
  /** Colis animé sur cette frame (glisse de l'aire d'arrivée vers son emplacement). */
  current?: number
  /** Emplacement du tapis (index 0..N-1) où atterrit `current`. */
  slot?: number
  /** Frame finale : verdict + ordre attendu. */
  event?: 'passed' | 'failed'
  expected?: number[]
}
