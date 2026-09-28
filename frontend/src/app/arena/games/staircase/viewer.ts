import { Application, Container, Graphics, Text, TextStyle, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import { easeOutBack, glowInto, lerp, mixColor, phase, rng, smooth, verticalGradient } from '../viewerKit'
import type { StaircaseFrame, StaircaseInit } from './types'

const COLOR = {
  skyTop: 0x29266a,
  skyMid: 0xb24f7c,
  skyLow: 0xffb066,
  sun: 0xffd27a,
  hillFar: 0x6b3a6e,
  hillNear: 0x4b2752,
  crane: 0x35203f,
  ground: 0x5f3e2b,
  groundTop: 0x8a5d3d,
  brick: 0xbf5230,
  brickLight: 0xdb7046,
  mortar: 0x5a2513,
  ghost: 0xfff1d6,
  bad: 0xe23b3b,
  stone: 0x8b8f99,
  cone: 0xff7a1a,
  term: 0x13141d,
  termBar: 0x242636,
  termText: 0xe3e6f0,
  termDim: 0x6c7189,
  termHi: 0x3b3420,
  ok: 0x4ade80,
  ko: 0xff6b6b,
  hat: 0xffc83d,
  vest: 0xff7a1a,
  skin: 0xf2c29b,
  pants: 0x2f3e66,
  flag: 0x22c55e,
  panel: 0xffffff,
  ink: 0x1f2433,
}

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'

interface TermLine {
  num: Text
  text: Text
  mark: Text
}

/**
 * Viewer de l'Escalier de briques : un chantier au coucher du soleil.
 *
 * Le plan de l'escalier est tracé en pointillés dès le départ ; chaque ligne écrite par le
 * joueur apparaît dans le terminal (à gauche) puis tombe, brique par brique, dans sa rangée.
 * Une fois l'escalier complet, l'ouvrier le gravit marche après marche et plante son drapeau.
 */
export function createStaircaseViewer(): GameViewer<StaircaseInit, StaircaseFrame> {
  let root: Container | null = null
  let skyG: Graphics | null = null
  let hookG: Graphics | null = null
  let groundG: Graphics | null = null
  let ghostG: Graphics | null = null
  let bricksG: Graphics | null = null
  let worker: Container | null = null
  let workerArm: Graphics | null = null
  let flagG: Graphics | null = null
  let termG: Graphics | null = null
  let termHiG: Graphics | null = null
  let termC: Container | null = null
  let termTitle: Text | null = null
  let placeholder: Text | null = null
  let termLines: TermLine[] = []
  let bannerG: Graphics | null = null
  let bannerTitle: Text | null = null
  let bannerDetail: Text | null = null
  let tick: ((ticker: Ticker) => void) | null = null

  let initRef: StaircaseInit | null = null
  let W = 0
  let H = 0
  let time = 0
  let flagAt: { x: number; y: number; k: number } | null = null

  let M = {
    termX: 0,
    termY: 0,
    termW: 0,
    termH: 0,
    headerH: 0,
    lineH: 0,
    areaL: 0,
    areaR: 0,
    groundY: 0,
    bw: 0,
    bh: 0,
    x0: 0,
    craneX: 0,
    jibY: 0,
  }

  const n = () => Math.max(1, initRef?.n ?? 1)
  const rowTop = (r: number) => M.groundY - (n() - r + 1) * M.bh
  const brickX = (c: number) => M.x0 + c * M.bw

  const recompute = () => {
    const termW = Math.max(132, Math.min(W * 0.27, 300))
    const termX = W * 0.03
    const termY = H * 0.1
    const termH = H * 0.74
    const headerH = Math.max(18, Math.min(26, H * 0.06))
    const lineH = Math.min(24, (termH - headerH - 16) / (n() + 1.4))
    const areaL = termX + termW + W * 0.04
    const areaR = W * 0.97
    const groundY = H * 0.87
    const bw = Math.min((areaR - areaL) / (n() + 1.8), ((groundY - H * 0.24) / n()) * 1.9)
    const bh = bw / 1.9
    M = {
      termX,
      termY,
      termW,
      termH,
      headerH,
      lineH,
      areaL,
      areaR,
      groundY,
      bw,
      bh,
      x0: areaL + (areaR - areaL - (n() + 1.3) * bw) / 2,
      craneX: W * 0.9,
      jibY: H * 0.16,
    }
  }

  // --- Décor --------------------------------------------------------------------------

  const buildScene = () => {
    if (!skyG || !groundG || !ghostG || !termG || !termC || !initRef) return
    const rnd = rng(512)

    skyG.clear()
    verticalGradient(skyG, 0, 0, W, H * 0.55, COLOR.skyTop, COLOR.skyMid, 40)
    verticalGradient(skyG, 0, H * 0.55, W, M.groundY - H * 0.55 + 2, COLOR.skyMid, COLOR.skyLow, 30)
    const sunX = W * 0.72
    const sunY = M.groundY - H * 0.07
    glowInto(skyG, sunX, sunY, Math.min(W, H) * 0.55, COLOR.sun, 0.5)
    skyG.circle(sunX, sunY, Math.min(W, H) * 0.11).fill(COLOR.sun)
    for (const [color, base, amp] of [
      [COLOR.hillFar, M.groundY - H * 0.1, H * 0.06],
      [COLOR.hillNear, M.groundY - H * 0.03, H * 0.04],
    ] as [number, number, number][]) {
      const p = rnd() * 6
      skyG.moveTo(0, M.groundY + 2)
      for (let x = 0; x <= W; x += W / 40) skyG.lineTo(x, base - Math.sin((x / W) * 5 + p) * amp)
      skyG.lineTo(W, M.groundY + 2).closePath().fill(color)
    }

    // Grue de chantier en silhouette : mât en treillis, flèche, contre-flèche.
    const cx = M.craneX
    const mastW = Math.max(8, W * 0.016)
    skyG.rect(cx - mastW / 2, M.jibY, mastW, M.groundY - M.jibY).fill(COLOR.crane)
    for (let y = M.jibY + mastW; y < M.groundY; y += mastW * 1.4) {
      skyG
        .moveTo(cx - mastW / 2, y)
        .lineTo(cx + mastW / 2, y + mastW * 1.4)
        .stroke({ color: COLOR.skyLow, width: 1, alpha: 0.35 })
    }
    skyG.rect(cx - W * 0.3, M.jibY - mastW * 0.6, W * 0.3 + mastW * 2.4, mastW * 0.75).fill(COLOR.crane)
    skyG.rect(cx + mastW * 0.6, M.jibY - mastW * 0.2, mastW * 1.4, mastW * 1.2).fill(COLOR.crane) // contrepoids
    skyG.poly([cx - mastW / 2, M.jibY - mastW * 0.6, cx, M.jibY - mastW * 3, cx + mastW / 2, M.jibY - mastW * 0.6]).fill(
      COLOR.crane,
    )

    // Sol du chantier, plots et pile de briques.
    groundG.clear()
    groundG.rect(0, M.groundY, W, H - M.groundY).fill(COLOR.ground)
    groundG.rect(0, M.groundY, W, Math.max(3, H * 0.012)).fill(COLOR.groundTop)
    for (let i = 0; i < 26; i++) {
      groundG.circle(rnd() * W, M.groundY + 6 + rnd() * (H - M.groundY - 8), 1 + rnd() * 2).fill({
        color: 0x000000,
        alpha: 0.18,
      })
    }
    const cone = (x: number, h: number) => {
      groundG!.poly([x - h * 0.35, M.groundY + 2, x + h * 0.35, M.groundY + 2, x, M.groundY - h]).fill(COLOR.cone)
      groundG!.rect(x - h * 0.2, M.groundY - h * 0.5, h * 0.4, h * 0.12).fill(0xffffff)
    }
    cone(M.areaR - M.bw * 0.3, Math.max(12, M.bh * 1.1))
    cone(M.termX + M.termW + W * 0.015, Math.max(10, M.bh * 0.9))

    // Plan de l'escalier : chaque brique attendue, en pointillés.
    ghostG.clear()
    for (let r = 1; r <= n(); r++) {
      for (let c = 0; c < r; c++) {
        const x = brickX(c)
        const y = rowTop(r)
        ghostG.roundRect(x + 2, y + 2, M.bw - 4, M.bh - 4, 3).fill({ color: COLOR.ghost, alpha: 0.06 })
        dashedRect(ghostG, x + 2, y + 2, M.bw - 4, M.bh - 4, COLOR.ghost, 0.45)
      }
    }

    // Terminal : fenêtre sombre avec la sortie du programme, ligne par ligne.
    termG.clear()
    termG.roundRect(M.termX, M.termY, M.termW, M.termH, 10).fill({ color: COLOR.term, alpha: 0.94 })
    termG.roundRect(M.termX, M.termY, M.termW, M.headerH, 10).fill(COLOR.termBar)
    termG.rect(M.termX, M.termY + M.headerH - 8, M.termW, 8).fill(COLOR.termBar)
    ;[0xff5f57, 0xfebc2e, 0x28c840].forEach((c, i) => {
      termG!.circle(M.termX + 12 + i * 13, M.termY + M.headerH / 2, Math.min(4.5, M.headerH * 0.2)).fill(c)
    })
    if (termTitle) {
      termTitle.style.fontSize = Math.max(9, M.headerH * 0.45)
      termTitle.position.set(M.termX + 12 + 3 * 13 + 4, M.termY + M.headerH / 2)
    }

    termC.removeChildren().forEach((c) => c.destroy())
    termLines = []
    const size = Math.max(9, M.lineH * 0.7)
    for (let k = 0; k < n() + 1; k++) {
      const y = M.termY + M.headerH + 10 + k * M.lineH
      const num = new Text({
        text: String(k + 1),
        style: new TextStyle({ fontFamily: MONO, fontSize: size * 0.85, fill: COLOR.termDim }),
      })
      num.anchor.set(1, 0)
      num.position.set(M.termX + 10 + size * 1.3, y)
      const text = new Text({ text: '', style: new TextStyle({ fontFamily: MONO, fontSize: size, fill: COLOR.termText }) })
      text.position.set(M.termX + 18 + size * 1.3, y - size * 0.06)
      const mark = new Text({ text: '', style: new TextStyle({ fontFamily: FONT, fontSize: size, fontWeight: '900', fill: COLOR.ok }) })
      mark.anchor.set(1, 0)
      mark.position.set(M.termX + M.termW - 8, y - size * 0.06)
      termC.addChild(num, text, mark)
      termLines.push({ num, text, mark })
    }
    if (placeholder) {
      placeholder.style.fontSize = Math.max(10, size * 0.9)
      placeholder.style.wordWrapWidth = M.termW - 24
      placeholder.position.set(M.termX + 12, M.termY + M.headerH + 12)
    }
  }

  /** Contour en pointillés (Pixi ne sait pas faire de tirets nativement). */
  const dashedRect = (g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha: number) => {
    const dash = Math.max(3, Math.min(w, h) * 0.18)
    const seg = (x1: number, y1: number, x2: number, y2: number) => {
      const len = Math.hypot(x2 - x1, y2 - y1)
      for (let d = 0; d < len; d += dash * 2) {
        const a = d / len
        const b = Math.min(1, (d + dash) / len)
        g.moveTo(lerp(x1, x2, a), lerp(y1, y2, a)).lineTo(lerp(x1, x2, b), lerp(y1, y2, b))
      }
    }
    seg(x, y, x + w, y)
    seg(x + w, y, x + w, y + h)
    seg(x + w, y + h, x, y + h)
    seg(x, y + h, x, y)
    g.stroke({ color, width: 1.5, alpha })
  }

  // --- Briques ------------------------------------------------------------------------

  const brick = (x: number, y: number, r: number, c: number, tint: number | null) => {
    if (!bricksG) return
    const shade = ((r * 31 + c * 17) % 7) / 7
    const fill = tint ?? mixColor(COLOR.brick, COLOR.brickLight, shade * 0.55)
    const w = M.bw
    const h = M.bh
    bricksG.roundRect(x + 1, y + 1, w - 2, h - 2, 3).fill(fill)
    bricksG.rect(x + 3, y + 2, w - 6, h * 0.2).fill({ color: 0xffffff, alpha: 0.13 })
    bricksG.rect(x + 3, y + h * 0.72, w - 6, h * 0.2).fill({ color: 0x000000, alpha: 0.1 })
    bricksG.roundRect(x + 1, y + 1, w - 2, h - 2, 3).stroke({ color: COLOR.mortar, width: 1.6, alpha: 0.85 })
  }

  const stone = (x: number, y: number) => {
    if (!bricksG) return
    bricksG.roundRect(x + 2, y + 2, M.bw - 4, M.bh - 4, M.bh * 0.35).fill(COLOR.stone)
    bricksG.roundRect(x + 2, y + 2, M.bw - 4, M.bh - 4, M.bh * 0.35).stroke({ color: 0x4b4f59, width: 1.5 })
  }

  /** Rangée qui tombe brique par brique ; renvoie true quand tout est posé. */
  const fallingRow = (r: number, text: string, t: number, tint: number | null) => {
    if (!bricksG) return
    const cells = text.split('').slice(0, 24)
    const count = Math.max(1, cells.length)
    const shake = tint !== null && t > 0.75 ? Math.sin(t * 70) * M.bw * 0.04 * (1 - t) * 4 : 0
    cells.forEach((ch, c) => {
      if (ch === ' ') return
      const start = (c / count) * 0.42
      const p = phase(t, start, start + 0.3)
      if (p <= 0) return
      const bounce = Math.sin(phase(t, start + 0.3, start + 0.4) * Math.PI) * M.bh * 0.12
      const x = brickX(c) + shake
      const y = lerp(rowTop(r) - H * 0.45, rowTop(r), p * p) - bounce
      if (ch === '#') brick(x, y, r, c, tint)
      else stone(x, y)
      // Poussière à l'atterrissage.
      const d = phase(t, start + 0.3, start + 0.52)
      if (d > 0 && d < 1) {
        for (const side of [-1, 1]) {
          bricksG!
            .circle(x + M.bw / 2 + side * M.bw * (0.45 + d * 0.4), rowTop(r) + M.bh, M.bh * (0.12 + d * 0.22))
            .fill({ color: 0xe9d3b8, alpha: 0.5 * (1 - d) })
        }
      }
    })
  }

  // --- Ouvrier --------------------------------------------------------------------------

  const buildWorker = () => {
    if (!worker) return
    worker.removeChildren().forEach((c) => c.destroy())
    const h = Math.max(26, M.bh * 2.05)
    const g = new Graphics()
    g.ellipse(0, 0, h * 0.22, h * 0.05).fill({ color: 0x000000, alpha: 0.25 })
    g.roundRect(-h * 0.13, -h * 0.36, h * 0.11, h * 0.36, 2).fill(COLOR.pants)
    g.roundRect(h * 0.02, -h * 0.36, h * 0.11, h * 0.36, 2).fill(COLOR.pants)
    g.roundRect(-h * 0.17, -h * 0.68, h * 0.34, h * 0.36, h * 0.08).fill(COLOR.vest)
    g.rect(-h * 0.17, -h * 0.55, h * 0.34, h * 0.05).fill(0xfff2a8) // bande réfléchissante
    g.circle(0, -h * 0.8, h * 0.13).fill(COLOR.skin)
    g.circle(h * 0.05, -h * 0.82, h * 0.02).fill(0x2b2b2b)
    g.ellipse(0, -h * 0.88, h * 0.16, h * 0.08).fill(COLOR.hat)
    g.rect(-h * 0.19, -h * 0.87, h * 0.38, h * 0.035).fill(COLOR.hat)
    worker.addChild(g)
    workerArm = new Graphics()
    workerArm.roundRect(-h * 0.04, 0, h * 0.08, h * 0.3, h * 0.04).fill(COLOR.vest)
    workerArm.circle(0, h * 0.31, h * 0.05).fill(COLOR.skin)
    workerArm.position.set(h * 0.14, -h * 0.64)
    worker.addChild(workerArm)
  }

  /** Points d'appui de l'ascension : le sol à droite, puis le dessus de chaque marche. */
  const climbPoint = (k: number) => {
    if (k <= 0) return { x: brickX(n()) + M.bw * 0.75, y: M.groundY }
    const r = n() - k + 1
    return { x: brickX(r - 1) + M.bw / 2, y: rowTop(r) }
  }

  // --- Terminal et bandeau --------------------------------------------------------------

  const paintTerminal = (frame: StaircaseFrame, t: number) => {
    if (!termHiG || !initRef) return
    termHiG.clear()
    const lines = initRef.lines
    const ev = frame.event
    const shownUpTo = ev === 'start' ? 0 : ev === 'climb' || ev === 'flag' ? n() : frame.row
    if (placeholder) placeholder.visible = ev === 'start'

    termLines.forEach((tl, k) => {
      const line = k + 1
      const visible = line <= shownUpTo && (k < lines.length || (ev === 'missing' && line === frame.row))
      tl.num.visible = visible
      tl.text.visible = visible
      tl.mark.text = ''
      if (!visible) return
      const current = line === frame.row && (ev === 'row' || ev === 'wrong' || ev === 'missing' || ev === 'extra')
      let content = lines[k] ?? ''
      if (current && ev !== 'missing') content = content.slice(0, Math.ceil(content.length * phase(t, 0, 0.3)))
      tl.text.text = ev === 'missing' && current ? '(rien)' : content
      tl.text.style.fill = current && ev !== 'row' ? COLOR.ko : COLOR.termText
      if (current) {
        const y = M.termY + M.headerH + 10 + k * M.lineH
        termHiG!.roundRect(M.termX + 4, y - 2, M.termW - 8, M.lineH, 4).fill({ color: COLOR.termHi, alpha: 0.9 })
      }
      const done = !current || (ev === 'row' && t > 0.55)
      if (current && ev !== 'row') {
        tl.mark.text = '✗'
        tl.mark.style.fill = COLOR.ko
      } else if (done) {
        tl.mark.text = '✓'
        tl.mark.style.fill = COLOR.ok
      }
    })
  }

  const showBanner = (title: string, detail: string, color: number, k: number) => {
    if (!bannerG || !bannerTitle || !bannerDetail) return
    bannerG.clear()
    bannerG.alpha = bannerTitle.alpha = bannerDetail.alpha = k
    if (k <= 0) return
    bannerTitle.text = title
    bannerTitle.style.fill = color
    bannerDetail.style.wordWrap = true
    bannerDetail.style.wordWrapWidth = Math.max(120, M.areaR - M.areaL - 32)
    bannerDetail.style.align = 'center'
    bannerDetail.text = detail
    const cx = (M.areaL + M.areaR) / 2
    const pw = Math.min(M.areaR - M.areaL, Math.max(bannerTitle.width, bannerDetail.width) + 40)
    const ph = bannerTitle.height + bannerDetail.height + 24
    const py = H * 0.04
    bannerG.roundRect(cx - pw / 2, py, pw, ph, 12).fill({ color: COLOR.panel, alpha: 0.95 }).stroke({ color, width: 3 })
    bannerTitle.position.set(cx, py + 10)
    bannerDetail.position.set(cx, py + 13 + bannerTitle.height)
  }

  // --- Ambiance -----------------------------------------------------------------------

  const ambient = (dt: number) => {
    time += dt
    const s = time / 1000
    if (hookG) {
      hookG.clear()
      const sway = Math.sin(s * 0.9) * W * 0.012
      const topX = M.craneX - W * 0.22
      const len = H * 0.28
      hookG.moveTo(topX, M.jibY).lineTo(topX + sway, M.jibY + len).stroke({ color: COLOR.crane, width: 1.5 })
      // Palette de briques suspendue au crochet.
      const px = topX + sway
      const py = M.jibY + len
      hookG.moveTo(px, py).lineTo(px - M.bw * 0.5, py + M.bh * 0.5).moveTo(px, py).lineTo(px + M.bw * 0.5, py + M.bh * 0.5)
      hookG.stroke({ color: COLOR.crane, width: 1.2 })
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < 2; col++) {
          const bx = px - M.bw * 0.5 + col * M.bw * 0.5
          const by = py + M.bh * 0.5 + row * M.bh * 0.45
          hookG.roundRect(bx, by, M.bw * 0.5, M.bh * 0.45, 2).fill(COLOR.brick).stroke({ color: COLOR.mortar, width: 1 })
        }
      }
      hookG.rect(px - M.bw * 0.55, py + M.bh * 1.4, M.bw * 1.1, M.bh * 0.14).fill(0x7a5634)
    }
    if (flagG) {
      flagG.clear()
      if (flagAt) {
        const pole = M.bh * 2.6 * flagAt.k
        const fw = M.bw * 0.75 * flagAt.k
        const fh = M.bh * 0.85 * flagAt.k
        flagG.rect(flagAt.x - 1.5, flagAt.y - pole, 3, pole).fill(0xe5e7eb)
        if (flagAt.k > 0.5) {
          const pts: number[] = []
          const SEG = 10
          for (let i = 0; i <= SEG; i++) {
            const u = i / SEG
            pts.push(flagAt.x + u * fw, flagAt.y - pole + Math.sin(s * 6 - u * 4) * fh * 0.12 * u)
          }
          for (let i = SEG; i >= 0; i--) {
            const u = i / SEG
            pts.push(flagAt.x + u * fw, flagAt.y - pole + fh + Math.sin(s * 6 - u * 4) * fh * 0.12 * u)
          }
          flagG.poly(pts).fill(COLOR.flag)
        }
      }
    }
  }

  return {
    setup(app: Application, init: StaircaseInit) {
      initRef = init
      W = app.screen.width
      H = app.screen.height
      recompute()

      root = new Container()
      app.stage.addChild(root)
      skyG = new Graphics()
      hookG = new Graphics()
      groundG = new Graphics()
      ghostG = new Graphics()
      bricksG = new Graphics()
      worker = new Container()
      flagG = new Graphics()
      termG = new Graphics()
      termHiG = new Graphics()
      termC = new Container()
      bannerG = new Graphics()
      termTitle = new Text({
        text: 'sortie',
        style: new TextStyle({ fontFamily: MONO, fontSize: 11, fill: COLOR.termDim }),
      })
      termTitle.anchor.set(0, 0.5)
      placeholder = new Text({
        text: 'Chaque ligne affichée par ton programme apparaîtra ici, puis deviendra une rangée de briques.',
        style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: COLOR.termDim, wordWrap: true, wordWrapWidth: 200 }),
      })
      bannerTitle = new Text({ text: '', style: new TextStyle({ fontFamily: FONT, fontSize: 20, fontWeight: '900', fill: COLOR.ko }) })
      bannerTitle.anchor.set(0.5, 0)
      bannerDetail = new Text({ text: '', style: new TextStyle({ fontFamily: FONT, fontSize: 14, fontWeight: '600', fill: COLOR.ink }) })
      bannerDetail.anchor.set(0.5, 0)

      root.addChild(skyG, hookG, groundG, ghostG, bricksG, flagG, worker, termG, termHiG, termTitle, placeholder, termC)
      root.addChild(bannerG, bannerTitle, bannerDetail)
      buildScene()
      buildWorker()

      tick = (ticker: Ticker) => ambient(ticker.deltaMS)
      app.ticker.add(tick)
    },

    resize(app: Application) {
      W = app.screen.width
      H = app.screen.height
      recompute()
      buildScene()
      buildWorker()
    },

    renderFrame(frame: StaircaseFrame, t: number) {
      if (!bricksG || !worker || !workerArm || !initRef) return
      const ev = frame.event
      const full = '#'

      // Rangées déjà posées, puis la rangée de la frame.
      bricksG.clear()
      const placedUpTo = ev === 'extra' || ev === 'climb' || ev === 'flag' ? n() : ev === 'start' ? 0 : frame.row - 1
      for (let r = 1; r <= placedUpTo; r++) {
        for (let c = 0; c < r; c++) brick(brickX(c), rowTop(r), r, c, null)
      }
      if (ev === 'row') fallingRow(frame.row, full.repeat(frame.row), t, null)
      if (ev === 'wrong') {
        fallingRow(frame.row, frame.got ?? '', t, mixColor(COLOR.brick, COLOR.bad, 0.6))
        // Le plan de la rangée attendue, souligné pour comparer.
        for (let c = 0; c < frame.row; c++) {
          dashedRect(bricksG, brickX(c) + 2, rowTop(frame.row) + 2, M.bw - 4, M.bh - 4, 0xffffff, 0.95 * phase(t, 0.6, 0.8))
        }
      }
      if (ev === 'missing') {
        const pulse = 0.35 + 0.35 * Math.sin(t * Math.PI * 4)
        for (let c = 0; c < frame.row; c++) {
          bricksG
            .roundRect(brickX(c) + 2, rowTop(frame.row) + 2, M.bw - 4, M.bh - 4, 3)
            .fill({ color: COLOR.bad, alpha: pulse * 0.6 })
        }
      }

      // Ouvrier : caché jusqu'à l'ascension, puis saute de marche en marche.
      worker.visible = ev === 'climb' || ev === 'flag'
      workerArm.rotation = 0
      flagAt = null
      if (ev === 'climb') {
        const u = smooth(t) * n()
        const k = Math.min(n() - 1, Math.floor(u))
        const local = u - k
        const a = climbPoint(k)
        const b = climbPoint(k + 1)
        worker.position.set(lerp(a.x, b.x, local), lerp(a.y, b.y, local) - Math.sin(local * Math.PI) * M.bh * 0.9)
        worker.scale.set(-1, 1) // il regarde vers la gauche, sens de la montée
      } else if (ev === 'flag') {
        const top = climbPoint(n())
        worker.position.set(top.x + M.bw * 0.12, top.y)
        worker.scale.set(-1, 1)
        workerArm.rotation = Math.PI * 0.85 + Math.sin(t * Math.PI * 6) * 0.25 // salut
        flagAt = { x: top.x - M.bw * 0.32, y: top.y, k: easeOutBack(phase(t, 0, 0.4)) }
      }

      paintTerminal(frame, t)

      const r = frame.row
      const k = phase(t, 0.55, 0.85)
      const plural = (v: number) => (v > 1 ? 's' : '')
      if (ev === 'wrong') {
        showBanner(
          'Rangée de travers',
          `Rangée ${r} : il faut ${r} brique${plural(r)} « ${full.repeat(r)} », reçu « ${frame.got ?? ''} »`,
          COLOR.bad,
          k,
        )
      } else if (ev === 'missing') {
        showBanner('Rangée manquante', `Il manque la rangée ${r} (${r} brique${plural(r)})`, COLOR.bad, k)
      } else if (ev === 'extra') {
        showBanner('Ligne en trop', `L'escalier n'a que ${n()} marches : « ${frame.got ?? ''} » est de trop`, COLOR.bad, k)
      } else if (ev === 'flag') {
        const total = (n() * (n() + 1)) / 2
        showBanner('Escalier terminé !', `${n()} marche${plural(n())}, ${total} brique${plural(total)} posée${plural(total)}`, 0x15803d, phase(t, 0.3, 0.6))
      } else {
        showBanner('', '', COLOR.ink, 0)
      }
    },

    teardown(app: Application) {
      if (tick) app.ticker.remove(tick)
      tick = null
      root?.destroy({ children: true })
      root = null
      skyG = hookG = groundG = ghostG = bricksG = flagG = termG = termHiG = bannerG = workerArm = null
      worker = termC = null
      termTitle = placeholder = bannerTitle = bannerDetail = null
      termLines = []
      flagAt = null
      initRef = null
    },
  }
}
