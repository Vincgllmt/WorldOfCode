export interface CaesarInit {
  /** Mot indice, présent dans le message en clair. */
  hint: string
  /** Message chiffré. */
  cipher: string
  /** Décalage utilisé (0..25). */
  shift: number
  /** Message en clair attendu. */
  expected: string
  /** Réponse du joueur (mise en majuscules, vide dans l'aperçu). */
  player: string
}

export type CaesarEvent =
  | 'start' // feuille chiffrée, roue au repos
  | 'wheel' // la roue tourne jusqu'au bon décalage
  | 'word' // un mot de la réponse se dévoile
  | 'passed' // tampon « déchiffré »
  | 'failed' // tampon « erreur » + corrections

export interface CaesarFrame {
  event: CaesarEvent
  /** Index du mot dévoilé (word), ou du dernier mot (passed / failed). */
  word?: number
}
