import type { GameViewerFactory, Replay } from '@/components/arena/gameViewer'

import { mazeMock } from './maze/mock'
import { createMazeViewer } from './maze/viewer'

/**
 * Registre des jeux : slug → viewer PixiJS.
 * Ajouter un jeu = écrire son viewer et l'enregistrer ici.
 */
export const GAME_VIEWERS: Record<string, GameViewerFactory> = {
  maze: createMazeViewer,
}

/**
 * Replays mockés en attendant le referee réel (Piston).
 * Permettent de développer/démontrer le visuel sans exécution serveur.
 */
export const GAME_MOCKS: Record<string, Replay> = {
  maze: mazeMock,
}
