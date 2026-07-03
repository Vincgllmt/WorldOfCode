import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { HorseRaceFrame, HorseRaceInit } from './types'

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = [
  0xe74c3c, 0x3498db, 0x2ecc71, 0xf39c12,
  0x9b59b6, 0x1abc9c, 0xe67e22, 0xe91e63,
]

// ─── Layout constants (logical pixels) ───────────────────────────────────────
const LABEL_W = 110   // left name column
const TRACK_W = 560   // race track width
const RANK_W  =  48   // right rank column
const LANE_H  =  56   // height of one lane
const PAD_V   =  14   // top/bottom padding
const TOTAL_W = LABEL_W + TRACK_W + RANK_W

/** Maps a race position [0, distance] to a screen x in the track area. */
const toX = (pos: number, distance: number) =>
  LABEL_W + Math.min(pos / distance, 1) * TRACK_W

/**
 * Viewer PixiJS de la course de chevaux.
 * Piste horizontale : une ligne par cheval, marqueur animé qui avance vers la ligne d'arrivée.
 */
export function createHorseRaceViewer(): GameViewer<HorseRaceInit, HorseRaceFrame> {
  let board:        Container | null = null
  let initRef:      HorseRaceInit | null = null
  let markers:      Container[]  = []   // one per horse
  let rankLabels:   Text[]       = []   // rank badge (#1, #2…)

  // Uniformly scale board to fit canvas.
  function layout(app: Application) {
    if (!board || !initRef) return
    const n    = initRef.horses.length
    const logH = n * LANE_H + 2 * PAD_V
    const s    = Math.min(app.screen.width / TOTAL_W, app.screen.height / logH)
    board.scale.set(s)
    board.position.set(
      (app.screen.width  - TOTAL_W * s) / 2,
      (app.screen.height - logH * s)    / 2,
    )
  }

  // Draw a horse silhouette centered at (0, 0) using PixiJS Graphics.
  function drawHorse(g: Graphics, color: number) {
    // Body
    g.roundRect(-20, -9, 38, 18, 5).fill(color)
    // Neck + head
    g.roundRect(12, -16, 10, 12, 3).fill(color)
    g.roundRect(18, -20, 10, 9, 4).fill(color)
    // Ear
    g.roundRect(20, -22, 4, 5, 2).fill(color)
    // Tail
    g.roundRect(-24, -7, 6, 10, 3).fill({ color, alpha: 0.8 })
    // Legs (4)
    g.rect(-14, 9, 5, 10).fill({ color, alpha: 0.9 })
    g.rect( -5, 9, 5, 10).fill({ color, alpha: 0.9 })
    g.rect(  5, 9, 5, 10).fill({ color, alpha: 0.9 })
    g.rect( 14, 9, 5, 10).fill({ color, alpha: 0.9 })
    // Eye (white + pupil)
    g.circle(24, -18, 2.5).fill(0xffffff)
    g.circle(25, -18, 1.2).fill(0x222222)
  }

  return {
    async setup(app: Application, init: HorseRaceInit) {
      initRef  = init
      board    = new Container()
      markers  = []
      rankLabels = []
      app.stage.addChild(board)

      const n = init.horses.length
      const logH = n * LANE_H + 2 * PAD_V

      // ── Background ────────────────────────────────────────────────────────
      board.addChild(
        new Graphics().rect(0, 0, TOTAL_W, logH).fill(0x0d1117),
      )

      // ── Lanes ─────────────────────────────────────────────────────────────
      for (let i = 0; i < n; i++) {
        const horse  = init.horses[i]
        const color  = PALETTE[i % PALETTE.length]
        const laneY  = PAD_V + i * LANE_H

        // Lane background (alternating)
        board.addChild(
          new Graphics()
            .rect(LABEL_W, laneY, TRACK_W, LANE_H - 2)
            .fill(i % 2 === 0 ? 0x161b22 : 0x1c2333),
        )

        // Subtle dirt lines on track
        for (let d = 0; d < 2; d++) {
          board.addChild(
            new Graphics()
              .rect(LABEL_W, laneY + LANE_H * (0.35 + d * 0.25), TRACK_W, 1)
              .fill({ color: 0x8b6914, alpha: 0.18 }),
          )
        }

        // Horse name label (right-aligned, left column)
        const nameText = new Text({
          text:  horse.name,
          style: new TextStyle({
            fill:       0xdde1e7,
            fontSize:   13,
            fontFamily: 'monospace',
          }),
        })
        nameText.anchor.set(1, 0.5)
        nameText.position.set(LABEL_W - 8, laneY + LANE_H / 2)
        board.addChild(nameText)

        // Horse marker
        const marker = new Container()
        const body   = new Graphics()
        drawHorse(body, color)
        marker.addChild(body)
        marker.position.set(toX(0, init.distance), laneY + LANE_H / 2)
        board.addChild(marker)
        markers.push(marker)

        // Rank label (hidden until the horse finishes)
        const rankLabel = new Text({
          text:  '',
          style: new TextStyle({
            fill:       0xffd700,
            fontSize:   15,
            fontFamily: 'monospace',
            fontWeight: 'bold',
          }),
        })
        rankLabel.anchor.set(0, 0.5)
        rankLabel.position.set(LABEL_W + TRACK_W + 6, laneY + LANE_H / 2)
        board.addChild(rankLabel)
        rankLabels.push(rankLabel)
      }

      // ── Finish line ───────────────────────────────────────────────────────
      const flX = LABEL_W + TRACK_W - 3
      const flH = n * LANE_H - 2
      // Checkerboard pattern
      const CHECKER = 8
      for (let row = 0; row * CHECKER < flH; row++) {
        board.addChild(
          new Graphics()
            .rect(flX - 7, PAD_V + row * CHECKER, 10, CHECKER)
            .fill(row % 2 === 0 ? 0xffffff : 0x111111),
        )
      }
      board.addChild(
        new Graphics().rect(flX, PAD_V, 3, flH).fill(0xffffff),
      )

      layout(app)
    },

    resize(app: Application) {
      layout(app)
    },

    renderFrame(frame: HorseRaceFrame, t: number, prev: HorseRaceFrame | null) {
      if (!initRef) return
      const { distance, horses } = initRef

      for (let i = 0; i < horses.length; i++) {
        const fromPos = prev ? prev.positions[i] : 0
        const toPos   = frame.positions[i]
        const pos     = fromPos + (toPos - fromPos) * t
        markers[i].position.x = toX(pos, distance)

        // Show rank once the horse reaches or passes the finish (toPos >= distance)
        if (toPos >= distance && horses[i].rank > 0 && rankLabels[i].text === '') {
          rankLabels[i].text = `#${horses[i].rank}`
        }
      }
    },

    teardown() {
      board?.destroy({ children: true })
      board      = null
      markers    = []
      rankLabels = []
      initRef    = null
    },
  }
}
