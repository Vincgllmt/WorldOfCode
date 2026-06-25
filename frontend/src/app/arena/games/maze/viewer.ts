import { AnimatedSprite, Application, Assets, Container, Graphics, Rectangle, Texture } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { MazeFrame, MazeInit } from './types'

const COLOR = {
  floor: 0x143b25,
  wall: 0x0a160f,
  start: 0xcfd6dc,
  goal: 0xf6c84c,
}

// Spritesheet caméléon 4×4 (512×512), frames de 128×128.
const SHEET = '/games/maze/cameleon.png'
const FRAME = 128
// Ligne 0 = caméléon orienté vers le haut ; on le fait pivoter selon la direction.
const WALK_ROW = 0
const WALK_FRAMES = 4

/**
 * Viewer PixiJS du labyrinthe : grille statique + token animé.
 * Factory → chaque montage du ReplayPlayer obtient une instance fraîche.
 */
export function createMazeViewer(): GameViewer<MazeInit, MazeFrame> {
  let board: Container | null = null
  let token: AnimatedSprite | null = null
  let initRef: MazeInit | null = null

  // Le plateau est dessiné en coordonnées « logiques » (une case = CELL),
  // puis le Container entier est mis à l'échelle pour remplir le canvas.
  // Ainsi la visualisation reste responsive : un simple re-scale au resize.
  const CELL = 100
  const PAD = 16

  const center = (x: number, y: number) => ({
    x: x * CELL + CELL / 2,
    y: y * CELL + CELL / 2,
  })

  // Met le plateau à l'échelle et le centre dans le canvas courant.
  const layout = (app: Application) => {
    if (!board || !initRef) return
    const w = app.screen.width
    const h = app.screen.height
    const natW = initRef.cols * CELL
    const natH = initRef.rows * CELL
    const scale = Math.max(0, Math.min((w - 2 * PAD) / natW, (h - 2 * PAD) / natH))
    board.scale.set(scale)
    board.position.set((w - natW * scale) / 2, (h - natH * scale) / 2)
  }

  return {
    async setup(app: Application, init: MazeInit) {
      initRef = init
      board = new Container()
      app.stage.addChild(board)

      const wallSet = new Set(init.walls.map(([x, y]) => `${x},${y}`))
      for (let y = 0; y < init.rows; y++) {
        for (let x = 0; x < init.cols; x++) {
          const isWall = wallSet.has(`${x},${y}`)
          const g = new Graphics()
          g.roundRect(x * CELL + 1.5, y * CELL + 1.5, CELL - 3, CELL - 3, 5).fill(
            isWall ? COLOR.wall : COLOR.floor,
          )
          board.addChild(g)
        }
      }

      const s = center(init.start[0], init.start[1])
      board.addChild(new Graphics().circle(s.x, s.y, CELL * 0.26).fill({ color: COLOR.start, alpha: 0.9 }))

      const g = center(init.goal[0], init.goal[1])
      board.addChild(
        new Graphics()
          .roundRect(g.x - CELL * 0.26, g.y - CELL * 0.26, CELL * 0.52, CELL * 0.52, 5)
          .fill(COLOR.goal),
      )

      // Caméléon animé (cycle de marche), découpé depuis la spritesheet.
      const sheet = await Assets.load<Texture>(SHEET)
      const walk: Texture[] = []
      for (let c = 0; c < WALK_FRAMES; c++) {
        walk.push(
          new Texture({
            source: sheet.source,
            frame: new Rectangle(c * FRAME, WALK_ROW * FRAME, FRAME, FRAME),
          }),
        )
      }

      token = new AnimatedSprite(walk)
      token.anchor.set(0.5)
      token.animationSpeed = 0.12
      token.play()
      token.width = CELL * 0.82
      token.height = CELL * 0.82
      board.addChild(token)
      token.position.set(s.x, s.y)

      layout(app)
    },

    resize(app: Application) {
      layout(app)
    },

    renderFrame(frame: MazeFrame, t: number, prev: MazeFrame | null) {
      if (!token) return
      const from = prev ? prev.pos : frame.pos
      const a = center(from[0], from[1])
      const b = center(frame.pos[0], frame.pos[1])
      token.position.set(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)

      // La spritesheet (ligne 0) regarde vers le bas → on pivote vers la direction.
      const dx = b.x - a.x
      const dy = b.y - a.y
      if (dx !== 0 || dy !== 0) token.rotation = Math.atan2(dy, dx) - Math.PI / 2
    },

    teardown() {
      board?.destroy({ children: true })
      board = null
      token = null
      initRef = null
    },
  }
}
