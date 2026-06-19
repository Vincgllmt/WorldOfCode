import { Application, Assets, Container, Graphics, Sprite, Text, Texture, type Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { MarsLanderEvent, MarsLanderFrame, MarsLanderInit } from './types'

const BACKGROUND = '/games/mars-lander/background.jpg'

// Fraction de la HAUTEUR de l'image où se trouve la bande plate d'atterrissage.
// L'altitude `landing.y` du cas est calée sur cette ligne : la capsule se pose
// donc sur le sol plat dessiné DANS l'image (pas de relief ajouté par-dessus).
// (Le sable de l'image va de ~0.855 au bas ; 0.90 = en plein dessus.)
// À ajuster si la piste de l'image se déplace.
const GROUND_FRAC = 0.9

const COL = {
  ok: 0x4ade80,
  bad: 0xff6b6b,
  neutral: 0xe2e8f0,
  label: 0xb8c2d0,
  trail: 0xfff1a8,
  flameOut: 0xff8a3d,
  flameMid: 0xffe06b,
  flameCore: 0xffffff,
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const BANNER: Record<MarsLanderEvent, { text: string; color: number }> = {
  landed: { text: 'ATTERRISSAGE RÉUSSI', color: 0x22c55e },
  'landed-bad': { text: 'POSÉ TROP BRUTALEMENT', color: 0xf59e0b },
  crashed: { text: 'CRASH', color: 0xef4444 },
  lost: { text: "PERDU DANS L'ESPACE", color: 0xef4444 },
  'out-of-commands': { text: 'PANNE DE COMMANDES', color: 0xf59e0b },
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

/**
 * Viewer Mars Lander : l'image de fond EST le décor + la piste d'atterrissage.
 * On ne dessine plus de sol : on cale l'altitude `landing.y` sur la bande plate
 * de l'image (`GROUND_FRAC`), et on anime au-dessus la capsule (rotation + flammes),
 * sa traînée, un HUD cockpit et une gerbe de réussite/crash.
 */
export function createMarsLanderViewer(): GameViewer<MarsLanderInit, MarsLanderFrame> {
  let initRef: MarsLanderInit | null = null
  let landY = 0

  // Transformation monde → écran : largeur du monde = largeur du canvas, et
  // l'altitude `landY` tombe sur la ligne de sol de l'image (`groundLineY`).
  let scale = 1
  let groundLineY = 0
  let landerScale = 1
  const toScreen = (wx: number, wy: number) => ({
    x: wx * scale,
    y: groundLineY - (wy - landY) * scale,
  })

  // Couches (du fond vers l'avant).
  let bg: Sprite | Graphics | null = null
  const trailG = new Graphics()
  const lander = new Container()
  const burstG = new Graphics()
  const hud = new Container()

  let flameG: Graphics | null = null
  let beaconG: Graphics | null = null

  // HUD (créés une fois, mis à jour par frame).
  const leftPanel = new Container()
  const rightPanel = new Container()
  const panelL = new Graphics()
  const panelR = new Graphics()
  const fuelBar = new Graphics()
  const leftRows: Text[] = []
  const rightRows: Text[] = []
  const banner = new Container()
  let bannerBg: Graphics | null = null
  let bannerText: Text | null = null

  // État courant partagé entre renderFrame et le ticker d'ambiance.
  let currentPower = 0
  let terminal = false
  let maxFuel = 0
  let firedTime = -1
  let burst: { type: MarsLanderEvent; x: number; y: number; age: number; parts: Particle[] } | null = null
  let elapsed = 0
  const hist: { time: number; x: number; y: number }[] = []
  let fxTickFn: ((t: Ticker) => void) | null = null

  // ---- HUD ----
  function makeRow(panelText: Container, idx: number) {
    const t = new Text({
      text: '',
      style: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        fontWeight: '600',
        fill: COL.label,
        letterSpacing: 0.4,
      },
    })
    t.position.set(12, 10 + idx * 19)
    panelText.addChild(t)
    return t
  }

  function buildHud() {
    leftPanel.addChild(panelL)
    leftRows.push(makeRow(leftPanel, 0), makeRow(leftPanel, 1), makeRow(leftPanel, 2))
    rightPanel.addChild(panelR)
    rightRows.push(
      makeRow(rightPanel, 0),
      makeRow(rightPanel, 1),
      makeRow(rightPanel, 2),
      makeRow(rightPanel, 3),
      makeRow(rightPanel, 4),
    )
    rightPanel.addChild(fuelBar)
    hud.addChild(leftPanel, rightPanel)

    bannerBg = new Graphics()
    bannerText = new Text({
      text: '',
      style: {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 22,
        fontWeight: '800',
        fill: 0xffffff,
        letterSpacing: 1,
      },
    })
    bannerText.anchor.set(0.5)
    banner.addChild(bannerBg, bannerText)
    banner.visible = false
    hud.addChild(banner)
  }

  function layoutHud(W: number, H: number) {
    const pw = 196
    const drawPanel = (g: Graphics, rows: number) => {
      g.clear()
      g.roundRect(0, 0, pw, 16 + rows * 19, 12).fill({ color: 0x0b1220, alpha: 0.62 })
      g.roundRect(0, 0, pw, 16 + rows * 19, 12).stroke({ width: 1, color: 0xffffff, alpha: 0.12 })
    }
    drawPanel(panelL, 3)
    drawPanel(panelR, 6) // 5 lignes + jauge de carburant
    leftPanel.position.set(14, 14)
    rightPanel.position.set(W - pw - 14, 14)
    banner.position.set(W / 2, H * 0.26)
  }

  function setFill(t: Text, color: number) {
    t.style.fill = color
  }

  function drawFuelBar(ratio: number) {
    fuelBar.clear()
    const x = 12
    const y = 10 + 5 * 19 + 2
    const w = 196 - 24
    fuelBar.roundRect(x, y, w, 7, 3).fill({ color: 0x1e293b, alpha: 0.9 })
    const c = ratio > 0.5 ? COL.ok : ratio > 0.2 ? 0xf59e0b : COL.bad
    if (ratio > 0) fuelBar.roundRect(x, y, Math.max(2, w * ratio), 7, 3).fill(c)
  }

  function updateHud(frame: MarsLanderFrame, x: number, y: number, hs: number, vs: number) {
    const alt = Math.max(0, Math.round(y - landY))
    leftRows[0].text = `TIME      ${frame.time}s`
    leftRows[1].text = `ALTITUDE  ${alt} m`
    leftRows[2].text = `POSITION  ${Math.round(x)} m`

    const hsR = Math.round(hs)
    const vsR = Math.round(vs)
    const hArrow = hsR > 0 ? '▶' : hsR < 0 ? '◀' : '·'
    const vArrow = vsR > 0 ? '▲' : vsR < 0 ? '▼' : '·'
    const rot = Math.round(frame.rotate)
    rightRows[0].text = `FUEL      ${frame.fuel} L`
    rightRows[1].text = `H SPEED   ${hArrow} ${Math.abs(hsR)} m/s`
    rightRows[2].text = `V SPEED   ${vArrow} ${Math.abs(vsR)} m/s`
    rightRows[3].text = `ANGLE     ${rot}°`
    rightRows[4].text = `POWER     ${frame.power}`
    setFill(rightRows[1], Math.abs(hsR) <= 20 ? COL.ok : COL.bad)
    setFill(rightRows[2], Math.abs(vsR) <= 40 ? COL.ok : COL.bad)
    setFill(rightRows[3], rot === 0 ? COL.ok : COL.neutral)

    maxFuel = Math.max(maxFuel, frame.fuel)
    drawFuelBar(maxFuel > 0 ? Math.max(0, Math.min(1, frame.fuel / maxFuel)) : 0)
  }

  // ---- Capsule ----
  function buildLander() {
    flameG = new Graphics()
    lander.addChild(flameG) // derrière le corps

    const body = new Graphics()
    // Trains d'atterrissage.
    body
      .moveTo(-9, 12).lineTo(-16, 23)
      .moveTo(9, 12).lineTo(16, 23)
      .moveTo(-20, 23).lineTo(-12, 23)
      .moveTo(12, 23).lineTo(20, 23)
      .stroke({ width: 3, color: 0x0f766e })
    // Corps capsule.
    body.roundRect(-13, -16, 26, 30, 12).fill(0x2dd4bf)
    body.roundRect(-13, -16, 26, 30, 12).stroke({ width: 2.5, color: 0xff7eb6 })
    // Hublot + œil (clin d'œil au caméléon pilote).
    body.circle(0, -4, 7).fill(0xbff7ff)
    body.circle(0, -4, 7).stroke({ width: 2, color: 0x0f766e })
    body.circle(2, -4, 2.4).fill(0x0b3b34)
    lander.addChild(body)

    beaconG = new Graphics()
    beaconG.circle(0, -19, 2.6).fill(0xff3b6b)
    lander.addChild(beaconG)

    // Pivot sur le bas des trains (local y = 23) : le point de contact physique
    // correspond aux pieds, la capsule se pose SUR le sol au lieu de s'y enfoncer.
    lander.pivot.set(0, 23)
  }

  function drawFlame(power: number, flick: number) {
    if (!flameG) return
    flameG.clear()
    if (power <= 0.05) return
    const len = 11 + power * 9 + flick * 7
    const w = 6 + power * 1.4
    flameG.poly([-w, 13, w, 13, 0, 13 + len]).fill({ color: COL.flameOut, alpha: 0.9 })
    flameG.poly([-w * 0.55, 13, w * 0.55, 13, 0, 13 + len * 0.7]).fill(COL.flameMid)
    flameG.poly([-w * 0.24, 13, w * 0.24, 13, 0, 13 + len * 0.42]).fill(COL.flameCore)
  }

  // ---- Traînée ----
  function upsertHist(time: number, x: number, y: number) {
    const e = hist.find((p) => p.time === time)
    if (e) {
      e.x = x
      e.y = y
    } else {
      hist.push({ time, x, y })
    }
  }

  function updateTrail(frame: MarsLanderFrame, prev: MarsLanderFrame | null, t: number) {
    if (prev) upsertHist(prev.time, prev.x, prev.y)
    upsertHist(frame.time, frame.x, frame.y)
    for (let i = hist.length - 1; i >= 0; i--) if (hist[i].time > frame.time) hist.splice(i, 1)
    hist.sort((a, b) => a.time - b.time)

    trailG.clear()
    if (hist.length === 0) return
    const pts = hist.map((p) => toScreen(p.x, p.y))
    for (let i = 1; i < pts.length; i++) {
      const a = 0.08 + 0.34 * (i / pts.length)
      trailG.moveTo(pts[i - 1].x, pts[i - 1].y).lineTo(pts[i].x, pts[i].y).stroke({ width: 2, color: COL.trail, alpha: a })
    }
    const from = prev ?? frame
    const head = toScreen(lerp(from.x, frame.x, t), lerp(from.y, frame.y, t))
    const lastp = pts[pts.length - 1]
    trailG.moveTo(lastp.x, lastp.y).lineTo(head.x, head.y).stroke({ width: 2.5, color: COL.trail, alpha: 0.55 })
    pts.forEach((p, i) => trailG.circle(p.x, p.y, 1.5).fill({ color: 0xffffff, alpha: 0.12 + 0.22 * (i / pts.length) }))
  }

  // ---- Gerbe de réussite / crash ----
  function fireBurst(type: MarsLanderEvent, sx: number, sy: number) {
    const parts: Particle[] = []
    const n = 26
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.3
      const sp = 1.6 + Math.random() * 3.2
      parts.push({ x: sx, y: sy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (type === 'landed' ? 1.6 : 0), life: 1 })
    }
    burst = { type, x: sx, y: sy, age: 0, parts }
    const b = BANNER[type]
    if (bannerText && bannerBg) {
      bannerText.text = b.text
      const bw = bannerText.width + 44
      const bh = bannerText.height + 22
      bannerBg.clear()
      bannerBg.roundRect(-bw / 2, -bh / 2, bw, bh, 14).fill({ color: 0x0b1220, alpha: 0.82 })
      bannerBg.roundRect(-bw / 2, -bh / 2, bw, bh, 14).stroke({ width: 2, color: b.color, alpha: 0.95 })
    }
    banner.visible = true
    banner.alpha = 0
    banner.scale.set(0.6)
  }

  function clearBurst() {
    burst = null
    burstG.clear()
    banner.visible = false
  }

  function updateBurst(dms: number) {
    if (!burst) return
    burst.age += dms
    const p = Math.min(1, burst.age / 950)
    burstG.clear()
    const col = burst.type === 'landed' ? COL.ok : COL.bad
    const ringR = 8 + p * 130 * landerScale
    burstG.circle(burst.x, burst.y, ringR).stroke({ width: 4 * (1 - p) + 1, color: col, alpha: 1 - p })
    for (const pt of burst.parts) {
      pt.x += pt.vx * landerScale
      pt.y += pt.vy * landerScale
      pt.vy += 0.07
      pt.life -= dms / 1100
      if (pt.life > 0) burstG.circle(pt.x, pt.y, 3 * pt.life + 1).fill({ color: col, alpha: Math.max(0, pt.life) })
    }
    const grow = Math.min(1, p * 2.2)
    banner.scale.set(0.6 + 0.4 * grow)
    banner.alpha = Math.min(1, p * 3)
  }

  // ---- Ticker d'ambiance ----
  function fxTick(ticker: Ticker) {
    elapsed += ticker.deltaMS
    const ts = elapsed / 1000
    if (beaconG) beaconG.alpha = Math.sin(ts * 6) > 0 ? 1 : 0.25
    if (terminal) flameG?.clear()
    else drawFlame(currentPower, Math.random() * 0.85)
    if (burst) updateBurst(ticker.deltaMS)
  }

  // ---- Layout global ----
  function layout(app: Application) {
    if (!initRef) return
    const W = app.screen.width
    const H = app.screen.height

    // Image en cover (remplit le canvas) ; on en déduit la ligne de sol.
    if (bg instanceof Sprite && bg.texture) {
      const iw = bg.texture.width
      const ih = bg.texture.height
      const cover = Math.max(W / iw, H / ih)
      const dispW = iw * cover
      const dispH = ih * cover
      bg.width = dispW
      bg.height = dispH
      bg.position.set((W - dispW) / 2, (H - dispH) / 2)
      groundLineY = (H - dispH) / 2 + GROUND_FRAC * dispH
    } else {
      if (bg instanceof Graphics) {
        bg.clear()
        bg.rect(0, 0, W, H).fill(0xc98aa0)
        bg.rect(0, H * GROUND_FRAC, W, H).fill(0xd1ab68)
      }
      groundLineY = H * GROUND_FRAC
    }

    // Largeur du monde = largeur du canvas ; altitude calée sur la ligne de sol.
    scale = W / initRef.width
    landerScale = Math.max(0.55, Math.min(1.5, (groundLineY) / 360))
    lander.scale.set(landerScale)

    layoutHud(W, H)
  }

  return {
    async setup(app: Application, init: MarsLanderInit) {
      initRef = init
      landY = init.landing.y ?? 0

      try {
        const tex = await Assets.load<Texture>(BACKGROUND)
        bg = new Sprite(tex)
      } catch {
        bg = new Graphics() // repli : fond uni si l'image manque
      }
      app.stage.addChild(bg)
      app.stage.addChild(trailG, lander, burstG, hud)

      buildLander()
      buildHud()
      layout(app)

      fxTickFn = fxTick
      app.ticker.add(fxTickFn)
    },

    resize(app: Application) {
      layout(app)
    },

    renderFrame(frame: MarsLanderFrame, t: number, prev: MarsLanderFrame | null) {
      const from = prev ?? frame
      const ix = lerp(from.x, frame.x, t)
      const iy = lerp(from.y, frame.y, t)
      const irot = lerp(from.rotate, frame.rotate, t)
      const ihs = lerp(from.hSpeed, frame.hSpeed, t)
      const ivs = lerp(from.vSpeed, frame.vSpeed, t)
      currentPower = lerp(from.power, frame.power, t)

      const s = toScreen(ix, iy)
      lander.position.set(s.x, s.y)
      lander.rotation = (-irot * Math.PI) / 180

      updateTrail(frame, prev, t)
      updateHud(frame, ix, iy, ihs, ivs)

      // Déclenche la gerbe sur la frame terminale (vers la fin de l'interpolation).
      if (frame.event && t >= 0.5) {
        if (firedTime !== frame.time) {
          firedTime = frame.time
          terminal = true
          fireBurst(frame.event, s.x, s.y)
        }
      } else if (!frame.event && (terminal || burst)) {
        terminal = false
        firedTime = -1
        clearBurst()
      }
    },

    teardown(app: Application) {
      if (fxTickFn) {
        app.ticker.remove(fxTickFn)
        fxTickFn = null
      }
      app.stage.removeChildren()
      bg?.destroy()
      trailG.destroy()
      lander.destroy({ children: true })
      burstG.destroy()
      hud.destroy({ children: true })
      leftRows.length = 0
      rightRows.length = 0
      hist.length = 0
      initRef = null
    },
  }
}
