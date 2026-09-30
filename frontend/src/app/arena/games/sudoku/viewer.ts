import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import { easeOutBack, glowInto, lerp, phase, rng, smooth, verticalGradient } from '../viewerKit'
import type { SudokuFrame, SudokuInit } from './types'

const COLOR = {
  paperTop: 0xf6efe0,
  paperLow: 0xe7d8bd,
  fiber: 0x9c8462,
  sun: 0xd9473f,
  mountain: 0x5d6b7a,
  branch: 0x3d2b22,
  blossom: 0xf6b6c8,
  blossomCore: 0xd9577a,
  tray: 0x8a5a3c,
  trayLight: 0xb27a52,
  cell: 0xfbf6ea,
  cellAlt: 0xf2e7d1,
  line: 0x3a3229,
  given: 0x1d1a17,
  ink: 0x2c4f9e,
  gold: 0xf2c14e,
  ko: 0xc62828,
  koFill: 0xf8d7d4,
  text: 0x2b241d,
  dim: 0x7a6a55,
}

const SERIF = 'Georgia, "Times New Roman", serif'
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/**
 * Viewer du Maître du Sudoku : une grille sur un plateau de bois, dans un décor japonais
 * (papier, soleil rouge, montagnes à l'encre, branche de cerisier qui perd ses pétales).
 *
 * La réponse du joueur s'inscrit ligne par ligne à l'encre indigo. Grille juste : une vague
 * dorée parcourt la grille et un ensō (cercle zen) se trace au pinceau. Grille fausse : les
 * chiffres en conflit sont entourés de rouge, les cases vides et les indices modifiés signalés.
 */
export function createSudokuViewer(): GameViewer<SudokuInit, SudokuFrame> {
  let root: Container | null = null
  let bgG: Graphics | null = null
  let boardG: Graphics | null = null
  let fxG: Graphics | null = null
  let digitsC: Container | null = null
  let marksG: Graphics | null = null
  let ensoG: Graphics | null = null
  let petalsG: Graphics | null = null
  let infoText: Text | null = null
  let titleText: Text | null = null
  let detailText: Text | null = null
  let digits: Text[] = []
  let tick: ((ticker: Ticker) => void) | null = null

  let initRef: SudokuInit | null = null
  let W = 0
  let H = 0
  let time = 0
  let petals: { x: number; y: number; r: number; speed: number; sway: number; phase: number }[] = []

  let L = { size: 0, cell: 0, x0: 0, y0: 0, sideX: 0, sideW: 0 }

  const recompute = () => {
    const size = Math.min(W * 0.6, H * 0.86)
    const x0 = Math.max(W * 0.36, W - size - W * 0.05)
    L = { size, cell: size / 9, x0, y0: (H - size) / 2, sideX: W * 0.04, sideW: x0 - W * 0.08 }
  }

  const cellCenter = (i: number) => ({
    x: L.x0 + ((i % 9) + 0.5) * L.cell,
    y: L.y0 + (Math.floor(i / 9) + 0.5) * L.cell,
  })

  // --- Décor ---------------------------------------------------------------------------

  const buildScene = () => {
    if (!bgG || !boardG || !digitsC || !initRef) return
    const rnd = rng(108)

    bgG.clear()
    verticalGradient(bgG, 0, 0, W, H, COLOR.paperTop, COLOR.paperLow, 36)
    for (let i = 0; i < 140; i++) {
      const x = rnd() * W
      const y = rnd() * H
      const len = 4 + rnd() * 14
      const a = rnd() * Math.PI
      bgG
        .moveTo(x, y)
        .lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len)
        .stroke({ color: COLOR.fiber, width: 0.6, alpha: 0.12 })
    }
    // Soleil rouge et montagnes à l'encre, très estompés.
    bgG.circle(W * 0.2, H * 0.62, Math.min(W, H) * 0.2).fill({ color: COLOR.sun, alpha: 0.16 })
    for (const [base, amp, alpha] of [
      [H * 0.86, H * 0.16, 0.12],
      [H * 0.94, H * 0.1, 0.18],
    ] as [number, number, number][]) {
      const p = rnd() * 4
      bgG.moveTo(0, H)
      for (let x = 0; x <= W; x += W / 30) {
        bgG.lineTo(x, base - Math.abs(Math.sin((x / W) * 3.2 + p)) * amp)
      }
      bgG.lineTo(W, H).closePath().fill({ color: COLOR.mountain, alpha })
    }
    // Branche de cerisier en haut à gauche.
    const branch = (x0: number, y0: number, x1: number, y1: number, w: number) => {
      bgG!.moveTo(x0, y0).quadraticCurveTo((x0 + x1) / 2, y0 + (y1 - y0) * 0.2 + H * 0.03, x1, y1)
      bgG!.stroke({ color: COLOR.branch, width: w, cap: 'round' })
    }
    const u = Math.min(W, H) / 100
    branch(-u * 4, H * 0.08, W * 0.3, H * 0.2, u * 1.6)
    branch(W * 0.12, H * 0.13, W * 0.2, H * 0.03, u * 0.9)
    branch(W * 0.22, H * 0.17, W * 0.27, H * 0.31, u * 0.7)
    for (let i = 0; i < 16; i++) {
      const t = rnd()
      const bx = lerp(0, W * 0.3, t) + (rnd() - 0.5) * u * 6
      const by = lerp(H * 0.08, H * 0.2, t) + (rnd() - 0.5) * u * 6
      const r = u * (1.2 + rnd() * 0.8)
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + rnd()
        bgG.circle(bx + Math.cos(a) * r * 0.8, by + Math.sin(a) * r * 0.8, r * 0.75).fill({ color: COLOR.blossom, alpha: 0.95 })
      }
      bgG.circle(bx, by, r * 0.35).fill(COLOR.blossomCore)
    }

    // Plateau : cadre en bois, cases papier, carrés 3×3 légèrement teintés.
    const { x0, y0, size, cell } = L
    const pad = Math.max(6, cell * 0.22)
    boardG.clear()
    boardG.roundRect(x0 - pad + 4, y0 - pad + 7, size + pad * 2, size + pad * 2, pad).fill({ color: 0x000000, alpha: 0.25 })
    boardG.roundRect(x0 - pad, y0 - pad, size + pad * 2, size + pad * 2, pad).fill(COLOR.tray)
    boardG.roundRect(x0 - pad * 0.55, y0 - pad * 0.55, size + pad * 1.1, size + pad * 1.1, pad * 0.6).fill(COLOR.trayLight)
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        boardG.rect(x0 + bc * cell * 3, y0 + br * cell * 3, cell * 3, cell * 3).fill((br + bc) % 2 === 0 ? COLOR.cell : COLOR.cellAlt)
      }
    }
    for (let k = 0; k <= 9; k++) {
      const thick = k % 3 === 0
      const w = thick ? Math.max(2, cell * 0.06) : 1
      boardG.rect(x0 + k * cell - w / 2, y0, w, size).fill({ color: COLOR.line, alpha: thick ? 1 : 0.35 })
      boardG.rect(x0, y0 + k * cell - w / 2, size, w).fill({ color: COLOR.line, alpha: thick ? 1 : 0.35 })
    }

    // Un texte par case (indice ou réponse du joueur).
    digitsC.removeChildren().forEach((c) => c.destroy())
    digits = []
    for (let i = 0; i < 81; i++) {
      const given = initRef.givens[i] !== '.'
      const d = new Text({
        text: given ? initRef.givens[i] : '',
        style: new TextStyle({
          fontFamily: SERIF,
          fontSize: cell * 0.62,
          fontWeight: given ? '700' : '400',
          fill: given ? COLOR.given : COLOR.ink,
        }),
      })
      d.anchor.set(0.5)
      const c = cellCenter(i)
      d.position.set(c.x, c.y + cell * 0.02)
      digitsC.addChild(d)
      digits.push(d)
    }

    // Colonne de gauche : informations et bilan.
    const fs = Math.max(11, Math.min(H * 0.045, L.sideW * 0.11))
    if (infoText) {
      infoText.style.fontSize = fs * 0.85
      infoText.style.wordWrapWidth = L.sideW
      infoText.position.set(L.sideX, H * 0.4)
    }
    if (titleText) {
      titleText.style.fontSize = fs * 1.15
      titleText.style.wordWrapWidth = L.sideW
      titleText.position.set(L.sideX, H * 0.6)
    }
    if (detailText) {
      detailText.style.fontSize = fs * 0.78
      detailText.style.wordWrapWidth = L.sideW
      detailText.position.set(L.sideX, H * 0.6 + fs * 1.6)
    }

    petals = []
    for (let i = 0; i < 9; i++) {
      petals.push({ x: rnd() * W * 0.45, y: rnd() * H, r: u * (0.8 + rnd() * 0.6), speed: 14 + rnd() * 18, sway: 10 + rnd() * 20, phase: rnd() * 6 })
    }
  }

  /** Ensō : cercle zen tracé au pinceau, épaisseur variable, ouvert à la fin. */
  const drawEnso = (k: number) => {
    if (!ensoG) return
    ensoG.clear()
    if (k <= 0) return
    const cx = L.sideX + L.sideW / 2
    const cy = H * 0.26
    const r = Math.min(L.sideW * 0.38, H * 0.15)
    const end = k * Math.PI * 1.85
    const STEPS = 64
    for (let s = 0; s < STEPS; s++) {
      const a0 = -Math.PI * 0.4 + (s / STEPS) * end
      const a1 = -Math.PI * 0.4 + ((s + 1) / STEPS) * end
      const u = s / STEPS
      const w = r * (0.07 + 0.11 * Math.sin(u * Math.PI) * (1 - u * 0.4))
      ensoG
        .moveTo(cx + Math.cos(a0) * r, cy + Math.sin(a0) * r)
        .lineTo(cx + Math.cos(a1) * r, cy + Math.sin(a1) * r)
        .stroke({ color: COLOR.ko, width: w, alpha: 0.9, cap: 'round' })
    }
  }

  const ambient = (dt: number) => {
    time += dt
    const s = time / 1000
    if (!petalsG) return
    petalsG.clear()
    for (const p of petals) {
      const y = (p.y + s * p.speed) % (H + 20)
      const x = p.x + Math.sin(s * 0.9 + p.phase) * p.sway + y * 0.25
      const rot = s * 1.5 + p.phase
      petalsG.ellipse(x, y, p.r * (0.6 + 0.4 * Math.abs(Math.cos(rot))), p.r * 0.55).fill({ color: COLOR.blossom, alpha: 0.85 })
    }
  }

  return {
    setup(app: Application, init: SudokuInit) {
      initRef = init
      W = app.screen.width
      H = app.screen.height
      recompute()

      root = new Container()
      app.stage.addChild(root)
      bgG = new Graphics()
      boardG = new Graphics()
      fxG = new Graphics()
      digitsC = new Container()
      marksG = new Graphics()
      ensoG = new Graphics()
      petalsG = new Graphics()
      const left = (size: number, weight: '600' | '800' | '900', fill: number) =>
        new TextStyle({ fontFamily: FONT, fontSize: size, fontWeight: weight, fill, wordWrap: true, wordWrapWidth: 200 })
      infoText = new Text({ text: '', style: left(13, '600', COLOR.text) })
      titleText = new Text({ text: '', style: left(18, '900', COLOR.ko) })
      detailText = new Text({ text: '', style: left(12, '600', COLOR.dim) })
      root.addChild(bgG, boardG, fxG, digitsC, marksG, ensoG, infoText, titleText, detailText, petalsG)
      buildScene()

      tick = (ticker: Ticker) => ambient(ticker.deltaMS)
      app.ticker.add(tick)
    },

    resize(app: Application) {
      W = app.screen.width
      H = app.screen.height
      recompute()
      buildScene()
    },

    renderFrame(frame: SudokuFrame, t: number) {
      if (!initRef || !fxG || !marksG || !infoText || !titleText || !detailText) return
      const { givens, player } = initRef
      const ev = frame.event
      const doneRows = ev === 'start' ? 0 : ev === 'row' ? frame.row ?? 0 : 9

      // Chiffres : indices toujours visibles, réponse inscrite ligne par ligne.
      let filled = 0
      for (let i = 0; i < 81; i++) {
        const d = digits[i]
        if (givens[i] !== '.') continue
        const r = Math.floor(i / 9)
        let k = 0
        if (r < doneRows) k = 1
        else if (ev === 'row' && r === frame.row) {
          const delay = ((i % 9) / 9) * 0.6
          k = phase(t, delay, delay + 0.3)
        }
        const ch = player[i]
        d.text = k > 0 && ch !== '.' ? ch : ''
        d.alpha = Math.min(1, k * 1.6)
        d.scale.set(lerp(1.45, 1, easeOutBack(k)))
        d.style.fill = COLOR.ink
        if (k >= 1 && ch !== '.') filled++
      }
      const empties = givens.split('').filter((c) => c === '.').length
      const clues = 81 - empties
      infoText.text = `${clues} indices · ${empties} cases à remplir\nRéponses inscrites : ${filled} / ${empties}`

      // Bandeau doré sur la ligne en cours d'écriture.
      fxG.clear()
      if (ev === 'row' && frame.row !== undefined) {
        fxG.rect(L.x0, L.y0 + frame.row * L.cell, L.size, L.cell).fill({ color: COLOR.gold, alpha: 0.22 * Math.sin(Math.min(1, t * 1.2) * Math.PI) + 0.08 })
      }

      marksG.clear()
      drawEnso(0)
      titleText.text = ''
      detailText.text = ''
      if (ev === 'passed') {
        // Vague dorée qui parcourt la grille en diagonale.
        for (let i = 0; i < 81; i++) {
          const d = ((i % 9) + Math.floor(i / 9)) / 16
          const w = Math.sin(phase(t, d * 0.6, d * 0.6 + 0.35) * Math.PI)
          if (w > 0) {
            const c = cellCenter(i)
            glowInto(fxG, c.x, c.y, L.cell * 0.9, COLOR.gold, 0.55 * w)
          }
        }
        drawEnso(smooth(phase(t, 0.15, 0.85)))
        titleText.text = 'Grille résolue !'
        titleText.style.fill = 0x2e7d32
        detailText.text = 'Chaque ligne, chaque colonne et chaque carré contient les chiffres de 1 à 9.'
        titleText.alpha = detailText.alpha = phase(t, 0.5, 0.8)
      } else if (ev === 'failed') {
        const k = phase(t, 0.15, 0.5)
        const pulse = 0.75 + 0.25 * Math.sin((time / 1000) * 6)
        const conflicts = frame.conflicts ?? []
        for (const i of conflicts) {
          const c = cellCenter(i)
          // Fond de case sur le calque du dessous, pour ne pas masquer le chiffre.
          fxG.rect(c.x - L.cell / 2 + 1, c.y - L.cell / 2 + 1, L.cell - 2, L.cell - 2).fill({ color: COLOR.koFill, alpha: 0.7 * k })
          marksG.circle(c.x, c.y, L.cell * 0.36).stroke({ color: COLOR.ko, width: Math.max(1.5, L.cell * 0.06), alpha: k * pulse })
          if (givens[i] === '.') digits[i].style.fill = COLOR.ko
        }
        for (const i of frame.changed ?? []) {
          const c = cellCenter(i)
          const r = L.cell * 0.3
          marksG.moveTo(c.x - r, c.y + r).lineTo(c.x + r, c.y - r).stroke({ color: COLOR.ko, width: Math.max(2, L.cell * 0.07), alpha: k })
        }
        for (const i of frame.invalid ?? []) {
          if (givens[i] !== '.') continue
          const c = cellCenter(i)
          marksG.circle(c.x, c.y, L.cell * 0.08).fill({ color: COLOR.ko, alpha: k })
        }
        const parts: string[] = []
        if (conflicts.length) parts.push(`${conflicts.length} chiffre${conflicts.length > 1 ? 's' : ''} en conflit`)
        const holes = (frame.invalid ?? []).filter((i) => givens[i] === '.').length
        if (holes) parts.push(`${holes} case${holes > 1 ? 's' : ''} vide${holes > 1 ? 's' : ''}`)
        const changed = frame.changed?.length ?? 0
        if (changed) parts.push(`${changed} indice${changed > 1 ? 's' : ''} modifié${changed > 1 ? 's' : ''}`)
        if (frame.rowsGot !== undefined && frame.rowsGot !== 9) parts.push(`${frame.rowsGot} ligne${frame.rowsGot > 1 ? 's' : ''} sur 9`)
        titleText.text = 'Grille incorrecte'
        titleText.style.fill = COLOR.ko
        detailText.text = parts.length ? parts.join(' · ') : 'Format de sortie inattendu.'
        titleText.alpha = detailText.alpha = phase(t, 0.4, 0.7)
      }
    },

    teardown(app: Application) {
      if (tick) app.ticker.remove(tick)
      tick = null
      root?.destroy({ children: true })
      root = null
      bgG = boardG = fxG = marksG = ensoG = petalsG = null
      digitsC = null
      infoText = titleText = detailText = null
      digits = []
      petals = []
      initRef = null
    },
  }
}
