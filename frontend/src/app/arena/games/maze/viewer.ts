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
  let cell = 0
  let ox = 0
  let oy = 0

  const center = (x: number, y: number) => ({
    x: ox + x * cell + cell / 2,
    y: oy + y * cell + cell / 2,
  })

  return {
    async setup(app: Application, init: MazeInit) {
      board = new Container()
      app.stage.addChild(board)

      const pad = 16
      const w = app.screen.width
      const h = app.screen.height
      cell = Math.floor(Math.min((w - 2 * pad) / init.cols, (h - 2 * pad) / init.rows))
      ox = (w - cell * init.cols) / 2
      oy = (h - cell * init.rows) / 2

      const wallSet = new Set(init.walls.map(([x, y]) => `${x},${y}`))
      for (let y = 0; y < init.rows; y++) {
        for (let x = 0; x < init.cols; x++) {
          const isWall = wallSet.has(`${x},${y}`)
          const g = new Graphics()
          g.roundRect(ox + x * cell + 1.5, oy + y * cell + 1.5, cell - 3, cell - 3, 5).fill(
            isWall ? COLOR.wall : COLOR.floor,
          )
          board.addChild(g)
        }
      }

      const s = center(init.start[0], init.start[1])
      board.addChild(new Graphics().circle(s.x, s.y, cell * 0.26).fill({ color: COLOR.start, alpha: 0.9 }))

      const g = center(init.goal[0], init.goal[1])
      board.addChild(
        new Graphics()
          .roundRect(g.x - cell * 0.26, g.y - cell * 0.26, cell * 0.52, cell * 0.52, 5)
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
      token.width = cell * 0.82
      token.height = cell * 0.82
      board.addChild(token)
      token.position.set(s.x, s.y)
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
    },
  }
}
