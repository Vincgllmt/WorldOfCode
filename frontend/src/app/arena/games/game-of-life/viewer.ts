import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import { easeOutBack, glowInto, lerp, mixColor, phase, rng, verticalGradient } from '../viewerKit'
import type { LifeFrame, LifeInit } from './types'

const COLOR = {
  bgTop: 0x06231f,
  bgLow: 0x020d0c,
  bench: 0x0b2a26,
  glass: 0xbff7ea,
  agar: 0x123a31,
  agarLight: 0x1a4c3f,
  gridLine: 0x2c6656,
  cell: 0x7dffb2,
  cellCore: 0xeafff3,
  birth: 0xffffff,
  death: 0xb86a4a,
  ko: 0xff5a5f,
  text: 0xd9fff0,
  dim: 0x7fb8a6,
  chart: 0x7dffb2,
  ok: 0x4ade80,
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

/** État courant mémorisé : le ticker redessine les cellules (respiration) entre deux frames. */
interface Shown {
  frame: LifeFrame
  t: number
  prev: LifeFrame | null
}

/**
 * Viewer de la Boîte de Petri : une culture vue au microscope.
 *
 * Chaque frame est une génération de la vraie évolution : les naissances éclosent, les
 * mortes se rétractent, les survivantes respirent. La dernière frame confronte la réponse
 * du joueur : cellules oubliées cerclées de rouge, cellules en trop barrées. Une courbe de
 * population se trace au fil des générations.
 */
export function createLifeViewer(): GameViewer<LifeInit, LifeFrame> {
  let root: Container | null = null
  let bgG: Graphics | null = null
  let dishG: Graphics | null = null
  let cellsG: Graphics | null = null
  let chartG: Graphics | null = null
  let genText: Text | null = null
  let popText: Text | null = null
  let bannerText: Text | null = null
  let legendText: Text | null = null
  let tick: ((ticker: Ticker) => void) | null = null

  let initRef: LifeInit | null = null
  let shown: Shown | null = null
  let W = 0
  let H = 0
  let time = 0
  /** Phase de respiration propre à chaque case (aléatoire mais stable). */
  let breath: number[] = []

  let L = { cell: 1, x0: 0, y0: 0, chartX: 0, chartY: 0, chartW: 0, chartH: 0 }

  const recompute = () => {
    if (!initRef) return
    const top = H * 0.13
    const bottom = H * 0.25
    const availW = W * 0.92
    const availH = H - top - bottom
    const cell = Math.max(2, Math.min(availW / initRef.cols, availH / initRef.rows))
    const gw = cell * initRef.cols
    const gh = cell * initRef.rows
    L = {
      cell,
      x0: (W - gw) / 2,
      y0: top + (availH - gh) / 2,
      chartX: W * 0.62,
      chartY: H - bottom + H * 0.045,
      chartW: W * 0.34,
      chartH: bottom - H * 0.08,
    }
  }

  const buildScene = () => {
    if (!bgG || !dishG || !initRef) return
    const { cols, rows } = initRef
    const { cell, x0, y0 } = L
    const gw = cell * cols
    const gh = cell * rows

    bgG.clear()
    verticalGradient(bgG, 0, 0, W, H, COLOR.bgTop, COLOR.bgLow, 36)
    glowInto(bgG, W / 2, y0 + gh / 2, Math.max(W, H) * 0.6, 0x2bd4a0, 0.16) // lumière du microscope
    // Hexagones discrets en fond (paillasse de labo).
    const rnd = rng(99)
    const hex = Math.max(18, Math.min(W, H) * 0.06)
    for (let y = 0; y < H + hex; y += hex * 0.87) {
      for (let x = (Math.round(y / (hex * 0.87)) % 2) * hex * 0.5; x < W + hex; x += hex) {
        if (rnd() < 0.55) continue
        const pts: number[] = []
        for (let k = 0; k < 6; k++) {
          const a = (Math.PI / 3) * k + Math.PI / 6
          pts.push(x + Math.cos(a) * hex * 0.45, y + Math.sin(a) * hex * 0.45)
        }
        bgG.poly(pts).stroke({ color: COLOR.gridLine, width: 1, alpha: 0.18 })
      }
    }

    // Boîte de Petri : bord de verre, gélose, quadrillage léger.
    const pad = Math.max(6, cell * 0.35)
    dishG.clear()
    dishG.roundRect(x0 - pad + 4, y0 - pad + 6, gw + pad * 2, gh + pad * 2, pad * 1.6).fill({ color: 0x000000, alpha: 0.35 })
    dishG.roundRect(x0 - pad, y0 - pad, gw + pad * 2, gh + pad * 2, pad * 1.6).fill({ color: COLOR.glass, alpha: 0.1 })
    dishG.roundRect(x0 - pad, y0 - pad, gw + pad * 2, gh + pad * 2, pad * 1.6).stroke({ color: COLOR.glass, width: 2, alpha: 0.55 })
    verticalGradient(dishG, x0, y0, gw, gh, COLOR.agarLight, COLOR.agar, 24)
    for (let x = 0; x <= cols; x++) dishG.rect(x0 + x * cell, y0, 1, gh).fill({ color: COLOR.gridLine, alpha: 0.45 })
    for (let y = 0; y <= rows; y++) dishG.rect(x0, y0 + y * cell, gw, 1).fill({ color: COLOR.gridLine, alpha: 0.45 })
    // Reflet sur le verre.
    dishG.roundRect(x0 - pad * 0.6, y0 - pad * 0.6, gw * 0.45, pad * 0.5, pad * 0.25).fill({ color: 0xffffff, alpha: 0.12 })

    const size = Math.max(11, Math.min(H * 0.05, W * 0.035))
    for (const t of [genText, popText, bannerText]) if (t) t.style.fontSize = size
    if (genText) genText.position.set(W * 0.04, H * 0.035)
    if (popText) popText.position.set(W * 0.96, H * 0.035)
    // Bilan sous la boîte, à gauche de la courbe de population.
    const below = y0 + gh + pad + H * 0.025
    if (bannerText) bannerText.position.set(W * 0.04, below)
    if (legendText) {
      legendText.style.fontSize = Math.max(9, size * 0.72)
      legendText.style.wordWrapWidth = W * 0.55
      legendText.position.set(W * 0.04, below + size * 1.35)
    }
  }

  // --- Cellules -------------------------------------------------------------------------

  /** Une colonie : halo, corps irrégulier, noyau lumineux. */
  const colony = (g: Graphics, idx: number, scale: number, color: number, alpha: number) => {
    if (!initRef || scale <= 0.01) return
    const x = L.x0 + ((idx % initRef.cols) + 0.5) * L.cell
    const y = L.y0 + (Math.floor(idx / initRef.cols) + 0.5) * L.cell
    const r = L.cell * 0.4 * scale
    g.circle(x, y, r * 1.55).fill({ color, alpha: 0.16 * alpha })
    g.circle(x, y, r).fill({ color, alpha: 0.9 * alpha })
    g.circle(x - r * 0.25, y - r * 0.2, r * 0.42).fill({ color: COLOR.cellCore, alpha: 0.75 * alpha })
  }

  const draw = () => {
    if (!cellsG || !initRef || !shown) return
    const { frame, t, prev } = shown
    const s = time / 1000
    cellsG.clear()
    const now = new Set(frame.alive)
    const before = new Set(prev && prev.event === 'gen' && frame.event === 'gen' ? prev.alive : frame.alive)
    const breathe = (idx: number) => 1 + 0.045 * Math.sin(s * 2.4 + (breath[idx] ?? 0))

    if (frame.event === 'gen') {
      // Mortes : elles se rétractent en brunissant.
      for (const idx of before) {
        if (now.has(idx)) continue
        colony(cellsG, idx, 1 - t, mixColor(COLOR.cell, COLOR.death, Math.min(1, t * 2)), 1 - t)
      }
      // Survivantes et naissances.
      for (const idx of now) {
        if (before.has(idx)) colony(cellsG, idx, breathe(idx), COLOR.cell, 1)
        else colony(cellsG, idx, easeOutBack(Math.min(1, t * 1.4)), mixColor(COLOR.birth, COLOR.cell, t), 1)
      }
      return
    }

    // Comparaison avec la réponse du joueur.
    const missing = new Set(frame.missing ?? [])
    const reveal = phase(t, 0.15, 0.55)
    for (const idx of now) {
      if (missing.has(idx)) colony(cellsG, idx, breathe(idx), COLOR.cell, lerp(1, 0.45, reveal))
      else colony(cellsG, idx, breathe(idx), COLOR.cell, 1)
    }
    if (reveal <= 0) return
    const cols = initRef.cols
    const pulse = 0.75 + 0.25 * Math.sin(s * 6)
    for (const idx of missing) {
      // Oubliée : cercle rouge en pointillés autour de la colonie attendue.
      const x = L.x0 + ((idx % cols) + 0.5) * L.cell
      const y = L.y0 + (Math.floor(idx / cols) + 0.5) * L.cell
      const r = L.cell * 0.47
      for (let k = 0; k < 10; k++) {
        const a0 = (k / 10) * Math.PI * 2
        cellsG.arc(x, y, r, a0, a0 + Math.PI / 10).stroke({ color: COLOR.ko, width: Math.max(1.5, L.cell * 0.08), alpha: reveal * pulse })
      }
    }
    for (const idx of frame.extra ?? []) {
      // En trop : colonie rouge barrée.
      const x = L.x0 + ((idx % cols) + 0.5) * L.cell
      const y = L.y0 + (Math.floor(idx / cols) + 0.5) * L.cell
      const r = L.cell * 0.34
      cellsG.circle(x, y, r).fill({ color: COLOR.ko, alpha: 0.8 * reveal })
      cellsG
        .moveTo(x - r, y - r)
        .lineTo(x + r, y + r)
        .moveTo(x + r, y - r)
        .lineTo(x - r, y + r)
        .stroke({ color: 0xffffff, width: Math.max(1.5, L.cell * 0.07), alpha: reveal * pulse })
    }
  }

  const drawChart = (frame: LifeFrame, t: number) => {
    if (!chartG || !initRef) return
    chartG.clear()
    const pop = initRef.population ?? []
    if (pop.length < 2) return
    const { chartX: x, chartY: y, chartW: w, chartH: h } = L
    const max = Math.max(1, ...pop)
    chartG.roundRect(x - 8, y - 8, w + 16, h + 16, 8).fill({ color: 0x000000, alpha: 0.25 })
    chartG.rect(x, y + h, w, 1).fill({ color: COLOR.dim, alpha: 0.6 })
    // Courbe tracée jusqu'à la génération courante (interpolée pendant la frame).
    const upto = frame.event === 'compare' ? pop.length - 1 : Math.max(0, frame.gen - 1 + t)
    const px = (g: number) => x + (g / (pop.length - 1)) * w
    const py = (v: number) => y + h - (v / max) * h
    chartG.moveTo(px(0), py(pop[0]))
    for (let g = 1; g <= Math.floor(upto); g++) chartG.lineTo(px(g), py(pop[g]))
    const frac = upto - Math.floor(upto)
    const g0 = Math.floor(upto)
    if (frac > 0 && g0 + 1 < pop.length) chartG.lineTo(lerp(px(g0), px(g0 + 1), frac), lerp(py(pop[g0]), py(pop[g0 + 1]), frac))
    chartG.stroke({ color: COLOR.chart, width: 2, alpha: 0.95 })
    const g1 = Math.min(pop.length - 1, Math.round(upto))
    chartG.circle(px(g1), py(pop[g1]), 3.5).fill(COLOR.cellCore)
  }

  const ambient = (dt: number) => {
    time += dt
    draw()
  }

  return {
    setup(app: Application, init: LifeInit) {
      initRef = init
      W = app.screen.width
      H = app.screen.height
      const rnd = rng(7)
      breath = Array.from({ length: init.cols * init.rows }, () => rnd() * Math.PI * 2)
      recompute()

      root = new Container()
      app.stage.addChild(root)
      bgG = new Graphics()
      dishG = new Graphics()
      cellsG = new Graphics()
      chartG = new Graphics()
      const style = (fill: number, weight: '600' | '800' = '800') =>
        new TextStyle({ fontFamily: FONT, fontSize: 14, fontWeight: weight, fill })
      genText = new Text({ text: '', style: style(COLOR.text) })
      popText = new Text({ text: '', style: style(COLOR.text) })
      popText.anchor.set(1, 0)
      bannerText = new Text({ text: '', style: style(COLOR.ok) })
      bannerText.anchor.set(0, 0)
      legendText = new Text({
        text: '',
        style: new TextStyle({ fontFamily: FONT, fontSize: 11, fontWeight: '600', fill: COLOR.dim, wordWrap: true, wordWrapWidth: 300 }),
      })
      legendText.anchor.set(0, 0)
      root.addChild(bgG, dishG, cellsG, chartG, genText, popText, bannerText, legendText)
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

    renderFrame(frame: LifeFrame, t: number, prev: LifeFrame | null) {
      if (!initRef || !genText || !popText || !bannerText || !legendText) return
      shown = { frame, t, prev }
      draw()
      drawChart(frame, t)

      genText.text =
        frame.event === 'compare' ? `Ta prédiction · génération ${frame.gen}` : `Génération ${frame.gen} / ${initRef.gens}`
      popText.text = `Population ${frame.alive.length}`

      bannerText.text = ''
      legendText.text = ''
      if (frame.event === 'compare') {
        const k = phase(t, 0.45, 0.75)
        bannerText.alpha = legendText.alpha = k
        const wrong = (frame.missing?.length ?? 0) + (frame.extra?.length ?? 0)
        if (frame.passed) {
          bannerText.text = 'Prédiction parfaite !'
          bannerText.style.fill = COLOR.ok
          legendText.text = 'Ta grille correspond cellule pour cellule.'
        } else {
          bannerText.text = wrong > 0 ? `${wrong} cellule${wrong > 1 ? 's' : ''} fausse${wrong > 1 ? 's' : ''}` : 'Format incorrect'
          bannerText.style.fill = COLOR.ko
          const rowsNote =
            frame.rowsGot !== undefined && frame.rowsGot !== initRef.rows
              ? ` Ta grille a ${frame.rowsGot} ligne${frame.rowsGot > 1 ? 's' : ''} au lieu de ${initRef.rows}.`
              : ''
          legendText.text = `Cercle rouge : cellule oubliée · croix : cellule en trop.${rowsNote}`
        }
      }
    },

    teardown(app: Application) {
      if (tick) app.ticker.remove(tick)
      tick = null
      root?.destroy({ children: true })
      root = null
      bgG = dishG = cellsG = chartG = null
      genText = popText = bannerText = legendText = null
      shown = null
      initRef = null
      breath = []
    },
  }
}
