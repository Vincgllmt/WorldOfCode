import type { GameViewerFactory, Replay } from '@/components/arena/gameViewer'

import { chameleonColorsMock } from './chameleon-colors/mock'
import { createChameleonColorsViewer } from './chameleon-colors/viewer'
import { mazeMock } from './maze/mock'
import { createMazeViewer } from './maze/viewer'

/**
 * Registre des jeux : slug → viewer PixiJS.
 * Ajouter un jeu = écrire son viewer et l'enregistrer ici.
 */
export const GAME_VIEWERS: Record<string, GameViewerFactory> = {
  maze: createMazeViewer,
  'chameleon-colors': createChameleonColorsViewer,
}

/**
 * Replays mockés en attendant le referee réel (Piston).
 * Permettent de développer/démontrer le visuel sans exécution serveur.
 */
export const GAME_MOCKS: Record<string, Replay> = {
  maze: mazeMock,
  'chameleon-colors': chameleonColorsMock,
}
