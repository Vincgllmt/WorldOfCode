export interface CountdownInit {
  /** Nombre de départ du compte à rebours. */
  n: number
  /** Annonces attendues, dans l'ordre : « N », …, « 1 », « FEU ». */
  sequence: string[]
}

export type CountdownEvent =
  | 'ready' // état de départ
  | 'tick' // une annonce juste (un nombre)
  | 'launch' // FEU : la fusée décolle
  | 'burst' // une salve d'explosions (wave 1 puis 2)
  | 'finale' // bouquet final
  | 'wrong' // annonce fausse
  | 'fizzle' // compte à rebours interrompu avant FEU
  | 'extra' // lignes écrites après FEU

export interface CountdownFrame {
  /** Nombre d'annonces justes déjà faites (pilote la mèche et les pastilles). */
  step: number
  event: CountdownEvent
  /** Annonce écrite par le joueur (tick / wrong / extra). */
  shown?: string
  /** Annonce attendue à cet endroit (wrong / fizzle). */
  expected?: string
  /** Numéro de salve (burst). */
  wave?: number
}
