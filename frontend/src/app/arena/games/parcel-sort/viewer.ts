import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { Parcel, ParcelSortFrame, ParcelSortInit } from './types'

const COLOR = {
  // Ambiance entrepôt (fond plein cadre)
  bgTop: 0x123420,
  bgFloor: 0x0a2214,
  glow: 0x1e5233,
  // Tapis
  beltBody: 0x0c2015,
  beltSurface: 0x17462b,
  beltEdge: 0x2c6b45,
  rail: 0x081810,
  roller: 0x2f6242,
  pulley: 0xe6ac2e, // poulies jaunes (comme la cover)
  shelf: 0x1c4d30,
  // Cartons kraft (teinte selon le volume : clair → foncé)
  kraftLight: 0xdcb884,
  kraftDark: 0xa9793f,
  lid: 0xe8cc98,
  tape: 0xf0e2bf,
  seam: 0x6f4f28,
  // Labels & états
  label: 0xf7f2e6,
  labelText: 0x3a2a12,
  volText: 0xd2e7d8,
  ok: 0x4ade80,
  ko: 0xef5350,
}

// Coordonnées « logiques » : plateau dessiné à taille fixe puis mis à l'échelle.
const COL = 130
const NAT_H = 380
const ARRIVAL_LINE = 150 // ligne où reposent les colis en attente
const BELT_SURFACE = 322 // surface supérieure du tapis (les colis reposent dessus)
const PAD = 16

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const smooth = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)

function mixColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff
  return (
    (Math.round(lerp(ar, br, t)) << 16) |
    (Math.round(lerp(ag, bg, t)) << 8) |
    Math.round(lerp(ab, bb, t))
  )
}

interface Node {
  container: Container
  size: number
}

/**
 * Viewer PixiJS du hangar : ambiance d'entrepôt + tapis roulant. Chaque colis
 * est un carton kraft dont la taille est proportionnelle au volume ; ils
 * reposent sur une ligne (alignés par le bas) pour que le tri par taille soit
 * lisible, et glissent un par un de l'arrivée vers le tapis, avec un rebond.
 */
export function createParcelSortViewer(): GameViewer<ParcelSortInit, ParcelSortFrame> {
  let bg: Graphics | null = null
  let board: Container | null = null
  let statusBar: Graphics | null = null
  let initRef: ParcelSortInit | null = null
  const nodes = new Map<number, Node>()
  const homeIndex = new Map<number, number>()

  const colX = (i: number) => i * COL + COL / 2
  const restY = (line: number, size: number) => line - size / 2

  const sizeOf = (vol: number, minR: number, maxR: number) => {
    const r = Math.cbrt(Math.max(1, vol))
    const norm = maxR > minR ? (r - minR) / (maxR - minR) : 0.5
    return 46 + norm * 58 // 46..104 px
  }
  const shadeOf = (vol: number, minR: number, maxR: number) => {
    const r = Math.cbrt(Math.max(1, vol))
    return maxR > minR ? (r - minR) / (maxR - minR) : 0.5
  }

  // Dessine un carton kraft centré sur (0,0), avec son ombre de contact.
  const drawParcel = (node: Container, size: number, shade: number, id: number) => {
    const s = size
    const fill = mixColor(COLOR.kraftLight, COLOR.kraftDark, shade)

    // Ombre de contact (au sol, sous le carton)
    node.addChild(
      new Graphics().ellipse(0, s / 2 + 2, s * 0.52, s * 0.12).fill({ color: 0x000000, alpha: 0.28 }),
    )

    // Corps du carton
    const box = new Graphics()
    box.roundRect(-s / 2, -s / 2, s, s, 7).fill(fill)
    // Rabat supérieur (plus clair) + couture centrale
    box.roundRect(-s / 2, -s / 2, s, s * 0.28, 7).fill({ color: COLOR.lid, alpha: 0.85 })
    box.rect(-1, -s / 2, 2, s * 0.28).fill({ color: COLOR.seam, alpha: 0.4 })
    // Ruban adhésif (vertical) + trait d'ombre à droite pour le volume
    box.rect(-s * 0.1, -s / 2, s * 0.2, s).fill({ color: COLOR.tape, alpha: 0.85 })
    box.roundRect(-s / 2, s * 0.12, s, s * 0.38, 7).fill({ color: 0x000000, alpha: 0.12 })
    box.roundRect(-s / 2, -s / 2, s, s, 7).stroke({ color: COLOR.seam, width: 2, alpha: 0.7 })
    node.addChild(box)

    // Étiquette d'expédition (petit label blanc avec l'id)
    const lw = Math.min(s * 0.5, 46)
    const lh = Math.min(s * 0.3, 26)
    node.addChild(
      new Graphics()
        .roundRect(-lw / 2, s * 0.06 - lh / 2, lw, lh, 4)
        .fill(COLOR.label)
        .stroke({ color: COLOR.seam, width: 1, alpha: 0.4 }),
    )
    const idText = new Text({
      text: String(id),
      style: new TextStyle({ fontFamily: 'sans-serif', fontSize: 15, fontWeight: '700', fill: COLOR.labelText }),
    })
    idText.anchor.set(0.5)
    idText.position.set(0, s * 0.06)
    node.addChild(idText)
  }

  // Fond plein cadre (ambiance) — dessiné en coordonnées écran, pas mis à l'échelle.
  const drawBg = (app: Application) => {
    if (!bg) return
    const w = app.screen.width
    const h = app.screen.height
    bg.clear()
    bg.rect(0, 0, w, h).fill(COLOR.bgTop)
    bg.rect(0, h * 0.55, w, h * 0.45).fill(COLOR.bgFloor)
    bg.ellipse(w / 2, h * 0.6, w * 0.55, h * 0.4).fill({ color: COLOR.glow, alpha: 0.35 })
  }

  const layout = (app: Application) => {
    drawBg(app)
    if (!board || !initRef) return
    const w = app.screen.width
    const h = app.screen.height
    const natW = Math.max(1, initRef.parcels.length) * COL
    const scale = Math.max(0, Math.min((w - 2 * PAD) / natW, (h - 2 * PAD) / NAT_H))
    board.scale.set(scale)
    board.position.set((w - natW * scale) / 2, (h - NAT_H * scale) / 2)
  }

  return {
    setup(app: Application, init: ParcelSortInit) {
      initRef = init
      bg = new Graphics()
      app.stage.addChild(bg)

      board = new Container()
      app.stage.addChild(board)

      const n = Math.max(1, init.parcels.length)
      const beltW = n * COL

      // Zone d'arrivage (bandeau discret en haut)
      board.addChild(
        new Graphics()
          .roundRect(6, ARRIVAL_LINE - 96, beltW - 12, 104, 10)
          .fill({ color: COLOR.shelf, alpha: 0.25 }),
      )

      // Tapis roulant
      const belt = new Graphics()
      belt.roundRect(6, BELT_SURFACE + 44, beltW - 12, 10, 5).fill({ color: 0x000000, alpha: 0.25 }) // ombre au sol
      belt.roundRect(4, BELT_SURFACE, beltW - 8, 56, 10).fill(COLOR.beltBody)
      belt.roundRect(4, BELT_SURFACE, beltW - 8, 14, 10).fill(COLOR.beltSurface) // surface
      belt.roundRect(4, BELT_SURFACE, beltW - 8, 56, 10).stroke({ color: COLOR.beltEdge, width: 3 })
      for (let x = 30; x < beltW - 10; x += 40) {
        belt.circle(x, BELT_SURFACE + 40, 7).fill(COLOR.roller)
      }
      belt.circle(24, BELT_SURFACE + 28, 15).fill(COLOR.pulley) // poulie gauche
      belt.circle(beltW - 24, BELT_SURFACE + 28, 15).fill(COLOR.pulley) // poulie droite
      board.addChild(belt)

      statusBar = new Graphics()
      board.addChild(statusBar)

      const roots = init.parcels.map((p) => Math.cbrt(Math.max(1, p.vol)))
      const minR = roots.length ? Math.min(...roots) : 0
      const maxR = roots.length ? Math.max(...roots) : 0

      const volStyle = new TextStyle({ fontFamily: 'sans-serif', fontSize: 14, fill: COLOR.volText })

      init.parcels.forEach((p: Parcel, i: number) => {
        homeIndex.set(p.id, i)
        const size = sizeOf(p.vol, minR, maxR)

        const container = new Container()
        drawParcel(container, size, shadeOf(p.vol, minR, maxR), p.id)

        const volLabel = new Text({ text: `${p.vol}`, style: volStyle })
        volLabel.anchor.set(0.5, 0)
        volLabel.position.set(0, size / 2 + 8)
        container.addChild(volLabel)

        container.position.set(colX(i), restY(ARRIVAL_LINE, size))
        board!.addChild(container)
        nodes.set(p.id, { container, size })
      })

      layout(app)
    },

    resize(app: Application) {
      layout(app)
    },

    renderFrame(frame: ParcelSortFrame, t: number) {
      if (!board) return
      const eased = smooth(t)

      nodes.forEach(({ container, size }, id) => {
        const i = homeIndex.get(id) ?? 0
        const placedIdx = frame.placed.indexOf(id)
        container.scale.set(1)

        if (id === frame.current && frame.slot != null) {
          const ax = colX(i), ay = restY(ARRIVAL_LINE, size)
          const bx = colX(frame.slot), by = restY(BELT_SURFACE, size)
          container.position.set(lerp(ax, bx, eased), lerp(ay, by, eased))
          // Petit rebond d'atterrissage (squash) sur la fin de la trajectoire.
          const k = clamp01((t - 0.7) / 0.3)
          const squash = Math.sin(k * Math.PI)
          container.scale.set(1 + 0.06 * squash, 1 - 0.06 * squash)
        } else if (placedIdx >= 0) {
          container.position.set(colX(placedIdx), restY(BELT_SURFACE, size))
        } else {
          container.position.set(colX(i), restY(ARRIVAL_LINE, size))
        }
      })

      if (statusBar) {
        statusBar.clear()
        if (frame.event) {
          const n = Math.max(1, initRef?.parcels.length ?? 1)
          const col = frame.event === 'passed' ? COLOR.ok : COLOR.ko
          statusBar.roundRect(4, BELT_SURFACE - 4, n * COL - 8, 64, 12).stroke({ color: col, width: 4 })
        }
      }
    },

    teardown() {
      bg?.destroy()
      board?.destroy({ children: true })
      bg = null
      board = null
      statusBar = null
      initRef = null
      nodes.clear()
      homeIndex.clear()
    },
  }
}
