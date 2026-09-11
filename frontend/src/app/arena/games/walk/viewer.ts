import { Application, Assets, BlurFilter, Container, Graphics, Sprite, Text, Texture, Ticker } from 'pixi.js'

import type { GameViewer } from '@/components/arena/gameViewer'

import type { Ambiance } from './ambiance'
import { mix, pickAmbiance } from './ambiance'
import type { Chameleon } from './chameleon'
import { CHAMELEON_UNIT, createChameleon } from './chameleon'
import type { WalkFrame, WalkInit } from './types'

/**
 * Couleurs indépendantes du moment de la journée : le balisage du jeu et le HUD.
 * Elles doivent rester lisibles sur les quatre ciels, d'où l'or, qui tranche
 * aussi bien sur le rose de l'aube que sur le bleu de la nuit.
 * Tout le reste de la palette vient de l'ambiance (voir `ambiance.ts`).
 */
const COLOR = {
  markDim: 0x32200f,
  markLit: 0xffd166,
  trail: 0xffcf6b,
  goalGlow: 0xffd166,
  hudText: 0xf2f7ef,
  hudPanel: 0x061410,
  hudAccent: 0xffd166,
  danger: 0xf07d6a,
}

/** Couleurs des confettis de victoire (feuilles, pétales et éclats dorés). */
const CONFETTI = [0xffd166, 0xff8fa3, 0x8ed07a, 0xffffff, 0x49a05c, 0xffb347]

const STRAWBERRY = '/games/chameleon-colors/fruit-r.png'

/** Au-delà, les numéros de pas se chevauchent : on ne garde que les pastilles. */
const MAX_LABELLED_STEPS = 12
/** Au-delà, on allège le décor par pas (halos, rameaux) pour rester fluide. */
const MAX_DETAILED_STEPS = 40

/** Générateur pseudo-aléatoire déterministe : même décor à chaque relecture du replay. */
function seeded(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 0x100000000
  }
}

/** Élément de décor qui oscille doucement autour de son point d'attache. */
interface Sway {
  c: Container
  phase: number
  amp: number
  speed: number
}

/** Élément de décor qui dérive lentement à l'horizontale et se replace en boucle. */
interface Drifter {
  c: Container
  speed: number
  width: number
}

/** Poussière lumineuse en suspension dans l'air. */
interface Mote {
  g: Graphics
  x: number
  y: number
  vx: number
  vy: number
  phase: number
  alpha: number
}

/** Particule éphémère : confetti de victoire, poussière de pas, onde de choc. */
interface Particle {
  g: Graphics
  vx: number
  vy: number
  vr: number
  grav: number
  life: number
  max: number
  ring: boolean
}

/**
 * Viewer PixiJS de la promenade : une branche qui traverse une canopée baignée de
 * lumière rasante, un caméléon qui avance d'un pas par frame, une fraise au bout.
 *
 * Comme le platformer, la scène est dessinée en coordonnées ÉCRAN et intégralement
 * reconstruite au redimensionnement : la branche occupe toujours toute la largeur,
 * quelle que soit la distance, et le décor remplit la hauteur.
 *
 * Deux animations cohabitent :
 * - `renderFrame` positionne tout ce qui dépend du replay (caméléon, pastilles, HUD) ;
 * - un ticker propre au viewer fait vivre le décor (vent, poussières, rayons, fraise)
 *   même quand la lecture est en pause.
 */
export function createWalkViewer(): GameViewer<WalkInit, WalkFrame> {
  let board: Container | null = null
  let scene: Container | null = null // décor, reconstruit au resize
  let air: Container | null = null // poussières lumineuses, reconstruites au resize
  let actors: Container | null = null // caméléon, fraise : créés une fois
  let fx: Container | null = null // particules éphémères
  let overlay: Container | null = null // vignettage + HUD

  let cham: Chameleon | null = null
  let tokenShadow: Graphics | null = null
  let question: Text | null = null
  let goal: Sprite | Graphics | null = null
  let goalGlow: Graphics | null = null
  let sparkles: Graphics[] = []
  let trailMask: Graphics | null = null
  let hudPanel: Graphics | null = null
  let hudText: Text | null = null
  let hudBarFill: Graphics | null = null
  let alert: Graphics | null = null
  let vignetteG: Graphics | null = null
  let rays: Container | null = null

  let ambText: Text | null = null
  let twinklers: { g: Graphics; phase: number; alpha: number }[] = []
  let marks: { dim: Graphics; lit: Graphics }[] = []
  let sways: Sway[] = []
  let motes: Mote[] = []
  let drifters: Drifter[] = []
  let particles: Particle[] = []

  let savedInit: WalkInit | null = null
  /** Ambiance du cas en cours : fixée par la distance, elle pilote toute la palette. */
  let A: Ambiance = pickAmbiance(1)
  let appW = 0
  let appH = 0
  let time = 0
  let celebrating = false
  let dustAt = -1
  let goalBaseY = 0
  let tokenScale = 1
  let tick: ((ticker: Ticker) => void) | null = null

  /** Toutes les mesures de la scène, dérivées de la taille courante du canvas. */
  let M = {
    distance: 1,
    marginL: 0,
    stepW: 1,
    branchY: 0,
    branchH: 10,
    wave: 0,
    cham: 20,
    horizon: 0,
  }

  const recompute = () => {
    const distance = Math.max(1, savedInit?.distance ?? 1)
    A = pickAmbiance(distance)
    const marginL = appW * 0.09
    const marginR = appW * 0.12 // un peu plus à droite : la fraise déborde de son pas
    const span = Math.max(1, appW - marginL - marginR)
    const stepW = span / distance
    const branchY = appH * 0.66 // dessus de la branche, au repos
    const branchH = Math.max(11, appH * 0.058)
    // Le caméléon grandit quand les pas sont espacés, sans jamais écraser la scène.
    const cham = Math.min(appH * 0.23, stepW * 1.35, appW * 0.13)
    M = {
      distance,
      marginL,
      stepW,
      branchY,
      branchH,
      wave: Math.min(appH * 0.018, stepW * 0.45),
      cham,
      horizon: branchY - appH * 0.11,
    }
  }

  const stepX = (i: number) => M.marginL + M.stepW * i

  /** Ordonnée du dessus de la branche : elle ondule légèrement sur la largeur. */
  const branchTopY = (x: number) => M.branchY + Math.sin((x / Math.max(1, appW)) * Math.PI * 1.7 + 0.55) * M.wave

  // --- Petits peintres réutilisables -------------------------------------------------

  /**
   * Flou gaussien avec marge explicite : sans elle, Pixi rogne la texture du filtre
   * au ras du contenu et laisse une couture visible sur le bord du conteneur.
   */
  const blur = (strength: number) => {
    const f = new BlurFilter({ strength, quality: 2 })
    f.padding = Math.ceil(strength * 6) + 12
    return f
  }

  /**
   * Halo lumineux : anneaux concentriques empilés. L'opacité de chaque anneau est la
   * *dérivée* de la décroissance voulue (quadratique), si bien que leur superposition
   * redonne un dégradé continu — sans les marches d'escalier d'un empilement naïf.
   */
  const glowInto = (g: Graphics, x: number, y: number, r: number, color: number, alpha: number) => {
    const RINGS = 24
    for (let i = RINGS; i >= 1; i--) {
      const u = i / RINGS
      g.circle(x, y, r * u).fill({ color, alpha: (alpha * 2 * (1 - u)) / RINGS })
    }
  }

  /** Ligne de collines : somme de deux sinus, remplie jusqu'au bas de l'écran. */
  const ridge = (baseY: number, amp: number, color: number, alpha: number, rnd: () => number) => {
    const g = new Graphics()
    const p1 = rnd() * Math.PI * 2
    const p2 = rnd() * Math.PI * 2
    const f1 = 1.1 + rnd() * 0.8
    const f2 = 2.6 + rnd() * 1.6
    const SAMPLES = 48
    g.moveTo(0, appH)
    for (let i = 0; i <= SAMPLES; i++) {
      const x = (appW * i) / SAMPLES
      const u = x / Math.max(1, appW)
      const y = baseY - (Math.sin(u * Math.PI * f1 + p1) * 0.65 + Math.sin(u * Math.PI * f2 + p2) * 0.35) * amp
      g.lineTo(x, y)
    }
    g.lineTo(appW, appH).closePath().fill({ color, alpha })
    return g
  }

  /** Sapin stylisé : trois étages de triangles sur un tronc. */
  const pine = (x: number, baseY: number, h: number, color: number) => {
    const g = new Graphics()
    const w = h * 0.42
    g.rect(x - h * 0.035, baseY - h * 0.18, h * 0.07, h * 0.2).fill(color)
    for (let k = 0; k < 3; k++) {
      const top = baseY - h * (0.98 - k * 0.26)
      const bot = baseY - h * (0.5 - k * 0.24)
      const ww = w * (0.55 + k * 0.24)
      g.poly([x, top, x + ww, bot, x - ww, bot]).fill(color)
    }
    return g
  }

  /**
   * Couronne d'arbre stylisée : un cœur ovale bordé de lobes ronds. C'est la
   * forme qui lit comme « cime » à toutes les tailles, là où un simple tas
   * d'ellipses ne donnait qu'une tache.
   */
  const crown = (g: Graphics, cx: number, cy: number, r: number, color: number, rnd: () => number) => {
    const lobes = 7
    for (let i = 0; i < lobes; i++) {
      const a = (i / lobes) * Math.PI * 2
      g.circle(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.42, r * (0.4 + rnd() * 0.16)).fill(color)
    }
    g.ellipse(cx, cy, r * 0.82, r * 0.58).fill(color)
  }

  /** Feuille en amande, orientée : la brique de base du feuillage détaillé. */
  const leafInto = (g: Graphics, x: number, y: number, len: number, ang: number, color: number, alpha = 1) => {
    const dx = Math.cos(ang) * len
    const dy = Math.sin(ang) * len
    const nx = -Math.sin(ang) * len * 0.34
    const ny = Math.cos(ang) * len * 0.34
    g.moveTo(x, y)
      .quadraticCurveTo(x + dx * 0.5 + nx, y + dy * 0.5 + ny, x + dx, y + dy)
      .quadraticCurveTo(x + dx * 0.5 - nx, y + dy * 0.5 - ny, x, y)
      .fill({ color, alpha })
  }

  /**
   * Nuage cartoon : des bouffées rondes toutes tangentes à une même ligne de base,
   * plus un bandeau qui remplit les festons entre elles — c'est ce qui donne le
   * dessous plat caractéristique. Aucun flou : les assets du jeu sont à contours nets.
   */
  const cloud = (h: number, rnd: () => number) => {
    const c = new Container()
    const g = new Graphics()
    const puffs = 4 + Math.floor(rnd() * 3)
    const centres: [number, number][] = []
    let x = 0
    let minR = Infinity
    for (let k = 0; k < puffs; k++) {
      const u = k / (puffs - 1)
      // Les bouffées du milieu sont les plus hautes : le nuage a une crête.
      const rr = h * (0.5 + Math.sin(u * Math.PI) * 0.5 + rnd() * 0.15)
      // Chaque bouffée se pose contre la précédente : la largeur du nuage découle
      // de ses bouffées, au lieu d'être tirée au sort (d'où les barres plates).
      if (k > 0) x += centres[k - 1][1] * 0.72 + rr * 0.72
      centres.push([x, rr])
      minR = Math.min(minR, rr)
    }
    const x0 = centres[0][0]
    const x1 = centres[centres.length - 1][0]
    const mid = (x0 + x1) / 2
    // Silhouette : les cercles posés sur y = 0, plus le bandeau qui comble les festons.
    for (const [cx, rr] of centres) g.circle(cx - mid, -rr, rr).fill(A.cloud.rim)
    g.rect(x0 - mid, -minR * 0.92, x1 - x0, minR * 0.92).fill(A.cloud.rim)
    // Dessous à l'ombre : une bande basse, forcément à l'intérieur de la silhouette.
    g.rect(x0 - mid, -minR * 0.28, x1 - x0, minR * 0.28).fill({ color: A.cloud.body, alpha: 0.4 })
    for (const [cx, rr] of centres) g.circle(cx - mid, -minR * 0.28, rr * 0.3).fill({ color: A.cloud.body, alpha: 0.4 })
    c.addChild(g)
    return c
  }

  /** Liane suspendue au bord haut, feuillue, qui balance au vent. */
  const vine = (x: number, len: number, rnd: () => number) => {
    const c = new Container()
    const g = new Graphics()
    const drift = (rnd() - 0.5) * len * 0.3
    // Tige : deux passes (ombre puis cœur) pour qu'elle se détache du ciel.
    for (const [w, col, a] of [[0.009, A.foliage.dark, 0.9], [0.005, A.foliage.vine, 1]] as [number, number, number][]) {
      g.moveTo(0, 0)
        .quadraticCurveTo(drift, len * 0.55, drift * 1.5, len)
        .stroke({ color: col, width: Math.max(1.5, appH * w), alpha: a })
    }
    const leaves = 6 + Math.floor(rnd() * 4)
    for (let k = 1; k <= leaves; k++) {
      const u = k / (leaves + 0.5)
      const lx = drift * u * u * 1.5 + drift * u * 0.4
      const ly = len * u
      const side = k % 2 ? 1 : -1
      const s = len * (0.13 + rnd() * 0.07)
      leafInto(g, lx, ly, s, side * (0.35 + rnd() * 0.35), k % 3 ? A.foliage.leaf : A.foliage.dark, 0.95)
    }
    // Bourgeon terminal, pour finir la liane proprement.
    leafInto(g, drift * 1.5, len, len * 0.14, Math.PI / 2, A.foliage.light, 0.9)
    c.addChild(g)
    c.position.set(x, -appH * 0.03)
    return c
  }

  /** Dégradé sombre sur les quatre bords : concentre le regard sur la branche. */
  const drawVignette = (g: Graphics, vignetteStrength: number) => {
    g.clear()
    const STEPS = 16
    const dx = appW * 0.22
    const dy = appH * 0.24
    for (let i = 0; i < STEPS; i++) {
      const a = vignetteStrength * (1 - i / STEPS)
      g.rect(0, 0, (dx * (STEPS - i)) / STEPS, appH).fill({ color: 0x000000, alpha: a })
      g.rect(appW - (dx * (STEPS - i)) / STEPS, 0, (dx * (STEPS - i)) / STEPS, appH).fill({ color: 0x000000, alpha: a })
      g.rect(0, 0, appW, (dy * (STEPS - i)) / STEPS).fill({ color: 0x000000, alpha: a })
      g.rect(0, appH - (dy * (STEPS - i)) / STEPS, appW, (dy * (STEPS - i)) / STEPS).fill({ color: 0x000000, alpha: a })
    }
  }

  // --- Particules --------------------------------------------------------------------

  const clearParticles = () => {
    for (const p of particles) p.g.destroy()
    particles = []
  }

  /** Bouffée de poussière soulevée par un pas. */
  const spawnDust = (x: number, y: number) => {
    if (!fx) return
    for (let i = 0; i < 7; i++) {
      const r = M.cham * (0.04 + Math.random() * 0.05)
      const g = new Graphics().circle(0, 0, r).fill({ color: A.wood.light, alpha: 0.5 })
      g.position.set(x + (Math.random() - 0.5) * M.cham * 0.4, y)
      fx.addChild(g)
      particles.push({
        g,
        vx: (Math.random() - 0.4) * 0.05 * appW * 0.01,
        vy: -Math.random() * appH * 0.0004,
        vr: 0,
        grav: appH * 0.0000015,
        life: 0,
        max: 520,
        ring: false,
      })
    }
  }

  /** Gerbe de confettis + onde de choc quand la fraise est attrapée. */
  const spawnBurst = (x: number, y: number) => {
    if (!fx) return
    // Éclat de lumière : un halo doux qui enfle et s'éteint aussitôt.
    const flash = new Graphics()
    glowInto(flash, 0, 0, M.cham * 1.5, COLOR.goalGlow, 0.8)
    flash.blendMode = 'add'
    flash.position.set(x, y)
    fx.addChild(flash)
    particles.push({ g: flash, vx: 0, vy: 0, vr: 0, grav: 0, life: 0, max: 520, ring: true })

    // Onde de choc : un cercle fin qui s'ouvre et se dissipe.
    const ring = new Graphics()
      .circle(0, 0, M.cham * 0.3)
      .stroke({ color: COLOR.goalGlow, width: Math.max(1.5, M.cham * 0.035), alpha: 0.75 })
    ring.position.set(x, y)
    fx.addChild(ring)
    particles.push({ g: ring, vx: 0, vy: 0, vr: 0, grav: 0, life: 0, max: 620, ring: true })

    for (let i = 0; i < 70; i++) {
      const ang = Math.random() * Math.PI * 2
      const speed = (0.4 + Math.random() * 1.5) * appH * 0.0009
      const s = M.cham * (0.05 + Math.random() * 0.06)
      const color = CONFETTI[Math.floor(Math.random() * CONFETTI.length)]
      const g = new Graphics()
      if (i % 3 === 0) g.circle(0, 0, s * 0.6).fill(color)
      else g.roundRect(-s * 0.5, -s * 0.28, s, s * 0.56, s * 0.2).fill(color)
      g.position.set(x, y)
      g.rotation = Math.random() * Math.PI
      fx.addChild(g)
      particles.push({
        g,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed - appH * 0.0006,
        vr: (Math.random() - 0.5) * 0.012,
        grav: appH * 0.0000045,
        life: 0,
        max: 1500 + Math.random() * 700,
        ring: false,
      })
    }
  }

  // --- Acteurs -----------------------------------------------------------------------

  /** Place les acteurs (créés une seule fois) selon les mesures courantes. */
  const placeActors = () => {
    if (!savedInit) return

    if (cham) {
      // Le caméléon est dessiné en unités (corps ≈ 1 de long, pattes en y = 0) :
      // l'échelle suffit à le dimensionner, et il se pose pile sur l'écorce.
      tokenScale = (M.cham * 1.15) / CHAMELEON_UNIT
      cham.root.scale.set(tokenScale)
      const x0 = stepX(0)
      cham.root.position.set(x0, branchTopY(x0) + M.branchH * 0.08)
    }
    if (tokenShadow) {
      tokenShadow.clear()
      tokenShadow.ellipse(0, 0, M.cham * 0.42, M.cham * 0.12).fill({ color: 0x000000, alpha: 0.38 })
    }
    if (question) {
      question.style.fontSize = Math.max(14, Math.round(M.cham * 0.5))
    }

    const gx = stepX(M.distance)
    goalBaseY = branchTopY(gx) + M.branchH * 0.06
    if (goal) {
      if (goal instanceof Sprite) {
        goal.width = M.cham * 0.68
        goal.height = M.cham * 0.68
      }
      goal.position.set(gx, goalBaseY)
    }
    if (goalGlow) {
      goalGlow.clear()
      glowInto(goalGlow, 0, 0, M.cham * 0.75, COLOR.goalGlow, 0.32)
      goalGlow.position.set(gx, goalBaseY - M.cham * 0.32)
    }
    for (const s of sparkles) s.position.set(gx, goalBaseY - M.cham * 0.32)

    // HUD : panneau translucide, compteur de pas et jauge de progression.
    const fs = Math.max(12, Math.round(appH * 0.042))
    const px = appW * 0.035
    const py = appH * 0.055
    const pw = fs * 8.6
    const ph = fs * 3.1
    if (hudPanel) {
      hudPanel.clear()
      hudPanel
        .roundRect(px, py, pw, ph, fs * 0.7)
        .fill({ color: COLOR.hudPanel, alpha: 0.62 })
        .roundRect(px, py, pw, ph, fs * 0.7)
        .stroke({ color: COLOR.hudAccent, width: 1, alpha: 0.28 })
        .roundRect(px + fs * 0.7, py + ph - fs * 0.95, pw - fs * 1.4, fs * 0.34, fs * 0.17)
        .fill({ color: 0xffffff, alpha: 0.14 })
    }
    if (hudText) {
      hudText.style.fontSize = fs
      hudText.position.set(px + fs * 0.75, py + fs * 0.72)
    }
    if (hudBarFill) {
      hudBarFill.clear()
      hudBarFill
        .roundRect(0, 0, Math.max(1, pw - fs * 1.4), fs * 0.34, fs * 0.17)
        .fill(COLOR.hudAccent)
      hudBarFill.position.set(px + fs * 0.7, py + ph - fs * 0.95)
    }

    if (ambText) {
      ambText.text = A.name.toUpperCase()
      ambText.style.fontSize = Math.max(9, Math.round(fs * 0.55))
      ambText.position.set(appW - px, py + fs * 0.2)
    }

    if (alert) {
      alert.clear()
      const STEPS = 12
      for (let i = 0; i < STEPS; i++) {
        const a = 0.05 * (1 - i / STEPS)
        const dx = (appW * 0.3 * (STEPS - i)) / STEPS
        const dy = (appH * 0.3 * (STEPS - i)) / STEPS
        alert.rect(0, 0, dx, appH).fill({ color: COLOR.danger, alpha: a })
        alert.rect(appW - dx, 0, dx, appH).fill({ color: COLOR.danger, alpha: a })
        alert.rect(0, 0, appW, dy).fill({ color: COLOR.danger, alpha: a })
        alert.rect(0, appH - dy, appW, dy).fill({ color: COLOR.danger, alpha: a })
      }
      alert.alpha = 0
    }
  }

  // --- Décor -------------------------------------------------------------------------

  /** Reconstruit tout le décor. Appelé au setup et à chaque resize. */
  const buildScene = (app: Application) => {
    if (!scene || !air || !savedInit) return
    const w = app.screen.width
    const h = app.screen.height
    if (w === appW && h === appH && scene.children.length > 0) return
    appW = w
    appH = h
    recompute()
    // Le décor est jeté puis reconstruit : on détruit pour ne rien laisser sur le GPU
    // (le resize se déclenche en rafale quand on tire la poignée du panneau).
    for (const c of scene.removeChildren()) c.destroy({ children: true })
    for (const c of air.removeChildren()) c.destroy({ children: true })
    marks = []
    sways = []
    motes = []
    drifters = []
    twinklers = []
    rays = null

    const detailed = M.distance <= MAX_DETAILED_STEPS
    const rnd = seeded(1337 + M.distance)

    // 1. Ciel : dégradé en bandes, du bleu profond vers l'or de l'horizon…
    const BANDS = 44
    const sky = new Graphics()
    for (let i = 0; i < BANDS; i++) {
      const t = i / (BANDS - 1)
      const col = t < 0.55 ? mix(A.sky.top, A.sky.mid, t / 0.55) : mix(A.sky.mid, A.sky.warm, (t - 0.55) / 0.45)
      sky.rect(0, (M.horizon * i) / BANDS, appW, M.horizon / BANDS + 1).fill(col)
    }
    // …puis, sous l'horizon, la vallée qui plonge dans l'ombre.
    const below = appH - M.horizon
    for (let i = 0; i < BANDS; i++) {
      const t = i / (BANDS - 1)
      const col =
        t < 0.12
          ? mix(A.sky.haze, A.under.top, t / 0.12)
          : t < 0.42
            ? mix(A.under.top, A.under.mid, (t - 0.12) / 0.3)
            : mix(A.under.mid, A.under.bottom, (t - 0.42) / 0.58)
      sky.rect(0, M.horizon + (below * i) / BANDS, appW, below / BANDS + 1).fill(col)
    }
    scene.addChild(sky)

    // 1b. Étoiles : seulement quand l'ambiance en prévoit (aube tardive, nuit).
    for (let i = 0; i < A.stars; i++) {
      const sx = rnd() * appW
      const sy = rnd() * M.horizon * 0.85
      const sr = appH * (0.0016 + rnd() * 0.0026)
      const g = new Graphics().circle(sx, sy, sr).fill(0xffffff)
      // Une étoile sur six est assez brillante pour se voir en croix.
      if (rnd() < 0.17) {
        const l = sr * 5
        g.moveTo(sx - l, sy).lineTo(sx + l, sy).moveTo(sx, sy - l).lineTo(sx, sy + l)
          .stroke({ color: 0xffffff, width: sr * 0.7, alpha: 0.5 })
      }
      g.blendMode = 'add'
      const st = { g, phase: rnd() * Math.PI * 2, alpha: 0.35 + rnd() * 0.6 }
      g.alpha = st.alpha
      scene.addChild(g)
      twinklers.push(st)
    }

    // 2. L'astre du moment — soleil ou lune — et son halo.
    const sunX = appW * A.light.x
    const sunY = appH * A.light.y
    const sunHalo = new Container()
    const haloG = new Graphics()
    glowInto(haloG, sunX, sunY, appH * 0.46, A.light.ray, A.light.halo)
    glowInto(haloG, sunX, sunY, appH * 0.13, A.light.core, A.light.halo * 0.62)
    haloG.blendMode = 'add'
    sunHalo.addChild(haloG)
    sunHalo.filters = [blur(Math.max(4, appH * 0.03))]
    scene.addChild(sunHalo)

    const sunG = new Graphics()
    const sunR = appH * A.light.r
    sunG.circle(sunX, sunY, sunR).fill(A.light.core)
    if (A.moon) {
      // Quelques mers lunaires : la lune ne doit pas être un simple disque plat.
      for (const [mx, my, mr] of [[-0.3, -0.24, 0.26], [0.22, 0.16, 0.3], [-0.12, 0.38, 0.18]] as [number, number, number][]) {
        sunG.circle(sunX + sunR * mx, sunY + sunR * my, sunR * mr).fill({ color: A.sky.warm, alpha: 0.28 })
      }
    }
    scene.addChild(sunG)

    // 3. Rayons crépusculaires : éventail lent qui tourne autour du soleil.
    rays = new Container()
    rays.position.set(sunX, sunY)
    const RAYS = 11
    const rayLen = Math.hypot(appW, appH)
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2
      const w = 0.018 + rnd() * 0.05
      const len = rayLen * (0.55 + rnd() * 0.6)
      const base = A.light.rayAlpha * (0.8 + rnd() * 0.5)
      const g = new Graphics()
      // Le rayon est découpé en tronçons dont l'opacité s'éteint avec la distance :
      // un seul triangle plein laisserait voir ses arêtes rectilignes en travers du ciel.
      const SEG = 7
      const at = (u: number, sgn: number) => [Math.cos(a + sgn * w) * len * u, Math.sin(a + sgn * w) * len * u]
      for (let k = 0; k < SEG; k++) {
        const u0 = k / SEG
        const u1 = (k + 1) / SEG
        g.poly([...at(u0, -1), ...at(u1, -1), ...at(u1, 1), ...at(u0, 1)]).fill({
          color: A.light.ray,
          alpha: base * (1 - u1) * (1 - u1),
        })
      }
      g.blendMode = 'add'
      rays.addChild(g)
    }
    scene.addChild(rays)

    // 3b. Nuages : ils dérivent lentement et donnent l'échelle du ciel.
    const nClouds = 5
    for (let i = 0; i < nClouds; i++) {
      const chh = appH * (0.02 + rnd() * 0.018)
      const c = cloud(chh, rnd)
      const cw = chh * 7
      c.position.set(appW * (i / nClouds) + rnd() * appW * 0.15, M.horizon * (0.1 + rnd() * 0.45))
      c.alpha = A.cloud.alpha * (0.8 + rnd() * 0.3)
      scene.addChild(c)
      drifters.push({ c, speed: appW * (0.0000035 + rnd() * 0.000004), width: cw * 2 })
    }

    // 4. Reliefs lointains : trois plans de plus en plus nets (perspective aérienne).
    const far = new Container()
    far.addChild(ridge(M.horizon - appH * 0.02, appH * 0.1, A.ridge.far, 0.4, rnd))
    scene.addChild(far)

    const midRidge = new Container()
    midRidge.addChild(ridge(M.horizon + appH * 0.012, appH * 0.07, A.ridge.mid, 0.85, rnd))
    scene.addChild(midRidge)

    // 5. Ligne de sapins sur la crête proche, puis la crête elle-même.
    const pines = new Container()
    const nPines = 14
    for (let i = 0; i < nPines; i++) {
      const px = appW * (-0.02 + 1.04 * (i / (nPines - 1))) + (rnd() - 0.5) * appW * 0.03
      pines.addChild(pine(px, M.horizon + appH * 0.045, appH * (0.09 + rnd() * 0.07), A.ridge.pine))
    }
    pines.alpha = 0.9
    scene.addChild(pines)
    scene.addChild(ridge(M.horizon + appH * 0.055, appH * 0.045, A.ridge.near, 0.95, rnd))

    // 6. Cimes du plan intermédiaire, alignées juste derrière la branche : elles
    //    referment le fond et donnent une assise à la scène.
    const backLeaves = new Graphics()
    for (let i = -1; i <= 11; i++) {
      const cx = (appW * i) / 10 + (rnd() - 0.5) * appW * 0.05
      crown(backLeaves, cx, M.branchY - appH * (0.01 + rnd() * 0.05), appW * (0.05 + rnd() * 0.035), mix(A.ridge.near, A.foliage.dark, 0.45), rnd)
    }
    scene.addChild(backLeaves)

    // 6b. Ce qu'on voit en contrebas : trois rangs de cimes de plus en plus sombres.
    //     C'est ce dégradé qui donne le vertige — la branche flotte au-dessus du vide.
    const depths: [number, number, number][] = [
      [0.24, 0.055, mix(A.under.top, A.under.mid, 0.35)],
      [0.5, 0.075, mix(A.under.mid, A.under.bottom, 0.3)],
      [0.8, 0.1, mix(A.under.mid, A.under.bottom, 0.8)],
    ]
    for (const [frac, size, col] of depths) {
      const g = new Graphics()
      const y = M.branchY + (appH - M.branchY) * frac
      for (let i = -1; i <= 12; i++) {
        const cx = (appW * i) / 11 + (rnd() - 0.5) * appW * 0.06
        crown(g, cx, y + (rnd() - 0.5) * appH * 0.025, appW * size * (0.75 + rnd() * 0.5), col, rnd)
      }
      scene.addChild(g)
    }

    // 7. Canopée : massée sur les deux coins hauts pour cadrer la scène, le ciel
    //    reste dégagé au milieu — un bandeau plein écrasait toute l'image.
    const canopyX = [-0.04, 0.08, 0.2, 0.32, 0.7, 0.82, 0.94, 1.05]
    for (const ux of canopyX) {
      const cx = appW * (ux + (rnd() - 0.5) * 0.03)
      const c = new Container()
      const g = new Graphics()
      crown(g, 0, appH * (0.02 + rnd() * 0.05), appW * (0.055 + rnd() * 0.035), A.foliage.dark, rnd)
      crown(g, appW * 0.01, appH * (0.01 + rnd() * 0.03), appW * (0.04 + rnd() * 0.025), A.foliage.leaf, rnd)
      c.addChild(g)
      c.position.set(cx, -appH * 0.06)
      scene.addChild(c)
      sways.push({ c, phase: rnd() * Math.PI * 2, amp: 0.03, speed: 0.0007 + rnd() * 0.0004 })
    }

    // 8. Lianes qui pendent de la canopée, tenues sur les côtés : le centre reste
    //    dégagé pour que la promenade se lise sans obstacle.
    const vineX = [0.04, 0.86, 0.97]
    for (const vx of vineX) {
      const c = vine(appW * (vx + (rnd() - 0.5) * 0.03), appH * (0.1 + rnd() * 0.12), rnd)
      scene.addChild(c)
      sways.push({ c, phase: rnd() * Math.PI * 2, amp: 0.055, speed: 0.0009 + rnd() * 0.0006 })
    }

    // 9. Ombre portée de la branche sur le vide : trois bandes de moins en moins
    //    opaques, pour rester net tout en gardant un bord doux.
    const shadow = new Graphics()
    for (let k = 0; k < 3; k++) {
      const off = M.branchH * (1.0 + k * 0.55)
      const thick = M.branchH * 0.6
      shadow.moveTo(0, branchTopY(0) + off)
      for (let x = 0; x <= appW; x += 12) shadow.lineTo(x, branchTopY(x) + off)
      shadow.lineTo(appW, branchTopY(appW) + off + thick)
      for (let x = appW; x >= 0; x -= 12) shadow.lineTo(x, branchTopY(x) + off + thick)
      shadow.closePath().fill({ color: 0x000000, alpha: 0.14 - k * 0.04 })
    }
    scene.addChild(shadow)

    // 10. Rameaux feuillus sous la branche, qui balancent eux aussi.
    if (detailed) {
      for (let i = 0; i < M.distance; i++) {
        if (i % 3 !== 1) continue
        const x = stepX(i) + M.stepW * 0.5
        const len = M.branchH * (1.7 + rnd() * 1.1)
        const c = new Container()
        const g = new Graphics()
        g.moveTo(0, 0)
          .quadraticCurveTo(M.stepW * 0.1, len * 0.6, M.stepW * 0.2, len)
          .stroke({ color: A.wood.dark, width: Math.max(1.5, M.branchH * 0.11) })
        for (let k = 0; k < 4; k++) {
          const u = 0.38 + k * 0.2
          const side = k % 2 ? 1 : -1
          leafInto(
            g,
            M.stepW * 0.2 * u * u + M.stepW * 0.04,
            len * u,
            M.branchH * (0.75 + rnd() * 0.35),
            side * (0.5 + rnd() * 0.35),
            k % 3 ? A.foliage.leaf : A.foliage.dark,
            0.95,
          )
        }
        c.addChild(g)
        c.position.set(x, branchTopY(x) + M.branchH * 0.9)
        scene.addChild(c)
        sways.push({ c, phase: rnd() * Math.PI * 2, amp: 0.075, speed: 0.0012 + rnd() * 0.0008 })
      }
    }

    // 11. La branche : corps ondulant, dessus éclairé, ventre à l'ombre, écorce, mousse.
    const branch = new Graphics()
    const topAt = (x: number) => branchTopY(x)
    const botAt = (x: number) => branchTopY(x) + M.branchH * (1 + 0.1 * Math.sin(x / Math.max(1, appW) * Math.PI * 3.1))
    branch.moveTo(0, topAt(0))
    for (let x = 0; x <= appW; x += 10) branch.lineTo(x, topAt(x))
    branch.lineTo(appW, botAt(appW))
    for (let x = appW; x >= 0; x -= 10) branch.lineTo(x, botAt(x))
    branch.closePath().fill(A.wood.bark)

    // Liseré éclairé sur le dessus + ombre sur le ventre.
    branch.moveTo(0, topAt(0) + M.branchH * 0.1)
    for (let x = 0; x <= appW; x += 10) branch.lineTo(x, topAt(x) + M.branchH * 0.1)
    branch.stroke({ color: A.wood.light, width: M.branchH * 0.2, alpha: 0.85 })
    branch.moveTo(0, botAt(0) - M.branchH * 0.14)
    for (let x = 0; x <= appW; x += 10) branch.lineTo(x, botAt(x) - M.branchH * 0.14)
    branch.stroke({ color: A.wood.dark, width: M.branchH * 0.26, alpha: 0.6 })

    // Nervures d'écorce, parallèles au fil du bois.
    for (let i = 0; i < 34; i++) {
      const bx = rnd() * appW
      const off = M.branchH * (0.3 + rnd() * 0.45)
      const l = appW * (0.015 + rnd() * 0.03)
      branch
        .moveTo(bx, topAt(bx) + off)
        .lineTo(bx + l, topAt(bx + l) + off + M.branchH * 0.06)
        .stroke({ color: A.wood.dark, width: Math.max(1, M.branchH * 0.045), alpha: 0.45 })
    }
    // Quelques nœuds.
    for (let i = 0; i < 3; i++) {
      const bx = appW * (0.15 + rnd() * 0.7)
      branch
        .ellipse(bx, topAt(bx) + M.branchH * 0.55, M.branchH * 0.22, M.branchH * 0.16)
        .fill({ color: A.wood.dark, alpha: 0.55 })
    }
    scene.addChild(branch)

    // Mousse sur le dessus : petits paquets verts irréguliers.
    const moss = new Graphics()
    for (let i = 0; i < 26; i++) {
      const mx = rnd() * appW
      const my = topAt(mx) + M.branchH * 0.06
      for (let k = 0; k < 4; k++) {
        moss.ellipse(
          mx + (rnd() - 0.5) * M.branchH * 1.4,
          my + rnd() * M.branchH * 0.16,
          M.branchH * (0.1 + rnd() * 0.16),
          M.branchH * (0.05 + rnd() * 0.06),
        ).fill({ color: k % 2 ? A.wood.moss : A.wood.mossDark, alpha: 0.75 })
      }
    }
    scene.addChild(moss)

    // 12. Sillage doré : trace complète le long de la branche, révélée par un masque
    //     que renderFrame étire jusqu'à la position du caméléon.
    const trail = new Graphics()
    trail.moveTo(stepX(0), topAt(stepX(0)) + M.branchH * 0.08)
    for (let x = stepX(0); x <= stepX(M.distance); x += 8) trail.lineTo(x, topAt(x) + M.branchH * 0.08)
    trail.stroke({ color: COLOR.trail, width: M.branchH * 0.34, alpha: 0.2 })
    trail.moveTo(stepX(0), topAt(stepX(0)) + M.branchH * 0.08)
    for (let x = stepX(0); x <= stepX(M.distance); x += 8) trail.lineTo(x, topAt(x) + M.branchH * 0.08)
    trail.stroke({ color: COLOR.trail, width: M.branchH * 0.12, alpha: 0.85 })
    trailMask = new Graphics().rect(0, 0, appW, appH).fill(0xffffff)
    trailMask.scale.x = 0
    trail.mask = trailMask
    scene.addChild(trail)
    scene.addChild(trailMask)

    // 13. Un repère par pas : encoche éteinte, doublée d'une pastille allumée
    //     que renderFrame révèle au passage du caméléon.
    for (let i = 0; i <= M.distance; i++) {
      const x = stepX(i)
      const y = topAt(x) + M.branchH * 0.52
      const r = Math.max(2.5, M.branchH * 0.15)

      // Encoche creusée dans l'écorce : un creux sombre, un rebord éclairé.
      const dim = new Graphics()
        .ellipse(x, y, r * 1.2, r)
        .fill({ color: COLOR.markDim, alpha: 0.55 })
        .ellipse(x, y - r * 0.22, r * 0.9, r * 0.6)
        .fill({ color: A.wood.light, alpha: 0.18 })

      const lit = new Graphics()
      if (detailed) {
        // Souffle de lumière qui monte du repère atteint : ellipses de plus en plus
        // larges et transparentes, pour rester sans arête visible.
        for (let k = 1; k <= 5; k++) {
          const u = k / 5
          lit.ellipse(x, y - M.branchH * 1.5 * u, r * (0.9 + u * 1.1), M.branchH * 0.5 * (1 - u * 0.5)).fill({
            color: COLOR.markLit,
            alpha: 0.05 * (1 - u),
          })
        }
      }
      glowInto(lit, x, y, r * 2.6, COLOR.markLit, 0.3)
      lit.circle(x, y, r).fill(COLOR.markLit)
      lit.alpha = 0
      scene.addChild(dim)
      scene.addChild(lit)
      marks.push({ dim, lit })

      if (M.distance <= MAX_LABELLED_STEPS && i > 0) {
        const label = new Text({
          text: String(i),
          style: {
            fontSize: Math.max(9, Math.round(M.branchH * 0.48)),
            fill: COLOR.hudText,
            fontFamily: 'monospace',
          },
        })
        label.anchor.set(0.5, 0)
        label.alpha = 0.45
        label.position.set(x, botAt(x) + M.branchH * 0.35)
        scene.addChild(label)
      }
    }

    // 14. Poussières lumineuses en suspension : la lumière devient palpable.
    const nMotes = 46
    for (let i = 0; i < nMotes; i++) {
      const r = appH * (0.0025 + rnd() * 0.005) * A.mote.size
      const g = new Graphics().circle(0, 0, r).fill(A.mote.color)
      g.blendMode = 'add'
      const mote: Mote = {
        g,
        x: rnd() * appW,
        y: rnd() * appH,
        vx: (0.1 + rnd() * 0.35) * appW * 0.00004,
        vy: -(0.1 + rnd() * 0.3) * appH * 0.00005,
        phase: rnd() * Math.PI * 2,
        alpha: A.mote.alpha * (0.45 + rnd() * 0.85),
      }
      g.position.set(mote.x, mote.y)
      air.addChild(g)
      motes.push(mote)
    }

    // 15. Vignettage : redessiné à la nouvelle taille (l'overlay, lui, est permanent).
    if (vignetteG) drawVignette(vignetteG, A.vignette)

    placeActors()
  }

  return {
    async setup(app: Application, init: WalkInit) {
      savedInit = init
      board = new Container()
      scene = new Container()
      air = new Container()
      actors = new Container()
      fx = new Container()
      overlay = new Container()
      board.addChild(scene, air, actors, fx, overlay)
      app.stage.addChild(board)

      // Couche fixe : vignettage, voile d'alerte et HUD. Créée une fois, seulement
      // redessinée aux resizes — buildScene ne touche qu'au décor.
      vignetteG = new Graphics()
      alert = new Graphics()
      hudPanel = new Graphics()
      hudBarFill = new Graphics()
      hudText = new Text({
        text: '',
        style: { fontSize: 14, fill: COLOR.hudText, fontFamily: 'monospace', fontWeight: '600' },
      })
      hudText.anchor.set(0, 0)
      // Nom de l'ambiance, discret en haut à droite : le joueur comprend que
      // chaque cas se déroule à un autre moment de la journée.
      ambText = new Text({
        text: '',
        style: { fontSize: 12, fill: COLOR.hudText, fontFamily: 'monospace', letterSpacing: 1.5 },
      })
      ambText.anchor.set(1, 0)
      ambText.alpha = 0.5
      overlay.addChild(vignetteG, alert, hudPanel, hudBarFill, hudText, ambText)

      buildScene(app)

      // Halo derrière la fraise (ajouté avant elle pour rester en arrière-plan).
      goalGlow = new Graphics()
      goalGlow.blendMode = 'add'
      actors.addChild(goalGlow)

      // La fraise, au bout de la branche.
      try {
        const tex = await Assets.load<Texture>(STRAWBERRY)
        const fruit = new Sprite(tex)
        fruit.anchor.set(0.5, 1)
        goal = fruit
      } catch {
        // Image absente : pastille dorée de repli, le replay reste lisible.
        goal = new Graphics().circle(0, -14, 14).fill(COLOR.goalGlow)
      }
      actors.addChild(goal)

      // Étincelles qui gravitent autour de la fraise.
      sparkles = []
      for (let i = 0; i < 6; i++) {
        const g = new Graphics()
        const s = 5
        g.poly([0, -s, s * 0.28, -s * 0.28, s, 0, s * 0.28, s * 0.28, 0, s, -s * 0.28, s * 0.28, -s, 0, -s * 0.28, -s * 0.28])
          .fill(COLOR.goalGlow)
        g.blendMode = 'add'
        actors.addChild(g)
        sparkles.push(g)
      }

      // Ombre du caméléon sur la branche (sous le sprite).
      tokenShadow = new Graphics()
      actors.addChild(tokenShadow)

      // Caméléon vectoriel, teinté par la lumière du moment.
      cham = createChameleon(A.cham)
      actors.addChild(cham.root)

      // Bulle « ? » : n'apparaît que sur un ordre incompris.
      question = new Text({
        text: '?',
        style: {
          fontSize: 20,
          fill: COLOR.danger,
          fontFamily: 'monospace',
          fontWeight: '700',
          stroke: { color: 0x2a1410, width: 4 },
        },
      })
      question.anchor.set(0.5, 1)
      question.alpha = 0
      actors.addChild(question)

      placeActors()

      // Vie du décor, indépendante de la lecture du replay (tourne même en pause).
      tick = (ticker: Ticker) => {
        const dt = ticker.deltaMS
        time += dt

        if (rays) rays.rotation += dt * 0.000012

        for (const s of sways) s.c.rotation = Math.sin(time * s.speed + s.phase) * s.amp

        for (const st of twinklers) {
          st.g.alpha = st.alpha * (0.55 + 0.45 * Math.sin(time * 0.0022 + st.phase))
        }

        for (const d of drifters) {
          d.c.x += d.speed * dt
          if (d.speed > 0 && d.c.x > appW + d.width) d.c.x = -d.width
          if (d.speed < 0 && d.c.x < -d.width) d.c.x = appW + d.width
        }

        for (const m of motes) {
          m.x += m.vx * dt
          m.y += m.vy * dt
          if (m.y < -appH * 0.05) {
            m.y = appH * 1.05
            m.x = Math.random() * appW
          }
          if (m.x > appW * 1.05) m.x = -appW * 0.05
          m.g.position.set(m.x + Math.sin(time * 0.0008 + m.phase) * appW * 0.006, m.y)
          // Les lucioles s'allument par à-coups ; la poussière, elle, respire.
          m.g.alpha = A.mote.blink
            ? m.alpha * Math.pow(Math.max(0, Math.sin(time * 0.0026 + m.phase)), 5)
            : m.alpha * (0.55 + 0.45 * Math.sin(time * 0.0015 + m.phase))
        }

        // La fraise respire, et ses étincelles tournent autour d'elle.
        if (goal && !celebrating) goal.y = goalBaseY + Math.sin(time * 0.0022) * M.cham * 0.05
        if (goalGlow) goalGlow.scale.set(1 + 0.08 * Math.sin(time * 0.0022))
        for (let i = 0; i < sparkles.length; i++) {
          const a = time * 0.0012 + (i / sparkles.length) * Math.PI * 2
          const rx = M.cham * 0.44
          sparkles[i].position.set(
            stepX(M.distance) + Math.cos(a) * rx,
            goalBaseY - M.cham * 0.32 + Math.sin(a) * rx * 0.45,
          )
          sparkles[i].scale.set(0.5 + 0.5 * Math.abs(Math.sin(a * 1.7)))
          sparkles[i].alpha = celebrating ? 0 : 0.35 + 0.4 * Math.abs(Math.sin(a * 1.7))
        }

        // Pattes, balancement, queue, clignements : le caméléon vit sa vie.
        if (cham) {
          cham.update(dt)
          // Il jubile tant que la célébration dure.
          cham.root.scale.set(celebrating ? tokenScale * (1 + 0.09 * Math.sin(time * 0.009)) : tokenScale)
        }

        // Particules : confettis, poussières de pas, onde de choc.
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i]
          p.life += dt
          const u = p.life / p.max
          if (u >= 1) {
            p.g.destroy()
            particles.splice(i, 1)
            continue
          }
          if (p.ring) {
            p.g.scale.set(1 + u * 7)
            p.g.alpha = (1 - u) * (1 - u)
          } else {
            p.vy += p.grav * dt
            p.g.x += p.vx * dt
            p.g.y += p.vy * dt
            p.g.rotation += p.vr * dt
            p.g.alpha = 1 - u * u
          }
        }
      }
      app.ticker.add(tick)
    },

    resize(app: Application) {
      buildScene(app)
    },

    renderFrame(frame: WalkFrame, t: number, prev: WalkFrame | null) {
      if (!cham || !savedInit) return

      const from = prev ? prev.pos : frame.pos
      const to = frame.pos
      const progress = from + (to - from) * t

      // Retour en arrière (scrub, rejouer) : on repart d'une scène propre.
      if (to < dustAt) {
        dustAt = -1
        clearParticles()
      }
      if (frame.event !== 'goal' && celebrating) {
        celebrating = false
        cham.root.scale.set(tokenScale)
        clearParticles()
      }

      let x = stepX(from) + (stepX(to) - stepX(from)) * t
      const ground = branchTopY(x)
      let y = ground + M.branchH * 0.08

      // Rebond de marche, pour que le pas se voie par-dessus le cycle de pattes.
      const hop = to !== from ? Math.sin(Math.PI * Math.min(1, t)) : 0
      y -= hop * M.cham * 0.07

      // Ordre incompris : le caméléon s'agite sur place sans avancer.
      if (frame.event === 'unknown') x += Math.sin(t * Math.PI * 6) * M.stepW * 0.16
      // Arrêt au mauvais endroit : il se hausse pour chercher la fraise du regard.
      if (frame.event === 'miss') y -= Math.abs(Math.sin(t * Math.PI * 2)) * M.cham * 0.06

      cham.root.position.set(x, y)
      // Les pattes ne bougent que pendant un pas ; l'œil vise la fraise, sauf
      // quand le caméléon ne comprend pas l'ordre reçu.
      cham.setWalking(to !== from)
      cham.setConfused(frame.event === 'unknown' || frame.event === 'miss')
      cham.look(stepX(M.distance) - x, goalBaseY - M.cham * 0.4 - y)
      if (tokenShadow) {
        tokenShadow.position.set(x, ground + M.branchH * 0.34)
        tokenShadow.scale.set(1 - hop * 0.25)
        tokenShadow.alpha = 0.32 - hop * 0.12
      }

      // Une bouffée de poussière à chaque pas posé.
      if (to !== from && t > 0.45 && dustAt !== to) {
        dustAt = to
        spawnDust(x, ground + M.branchH * 0.25)
      }

      // Le sillage doré s'étire jusqu'au caméléon.
      if (trailMask) trailMask.scale.x = Math.min(1, (x + M.stepW * 0.1) / Math.max(1, appW))

      // Les pastilles s'allument au fur et à mesure : la progression se lit d'un coup d'œil.
      for (let i = 0; i < marks.length; i++) {
        const passed = i <= progress + 0.001
        marks[i].lit.alpha = passed ? 1 : 0
        marks[i].dim.alpha = passed ? 0 : 1
        // Le pas qui vient d'être atteint « éclot » légèrement.
        const fresh = Math.max(0, 1 - Math.abs(progress - i) * 2.5)
        marks[i].lit.scale.set(1 + fresh * 0.3)
        marks[i].lit.position.set(-stepX(i) * fresh * 0.3, -(branchTopY(stepX(i)) + M.branchH * 0.52) * fresh * 0.3)
      }

      // La fraise disparaît quand le caméléon l'attrape — et la fête commence.
      const eaten = frame.event === 'goal' ? Math.max(0, 1 - t * 1.6) : 1
      if (goal) goal.alpha = eaten
      if (goalGlow) goalGlow.alpha = eaten
      if (frame.event === 'goal' && !celebrating && t > 0.25) {
        celebrating = true
        spawnBurst(stepX(M.distance), goalBaseY - M.cham * 0.35)
      }

      // Signalement d'erreur : voile rouge discret et « ? » au-dessus du caméléon.
      const wrong = frame.event === 'unknown' || frame.event === 'miss'
      if (alert) alert.alpha = wrong ? 0.3 + 0.25 * Math.abs(Math.sin(t * Math.PI * 3)) : 0
      if (question) {
        question.alpha = frame.event === 'unknown' ? 1 : 0
        question.position.set(x, y - M.cham * 0.82)
      }

      if (hudText) hudText.text = `${Math.round(progress)} / ${M.distance} pas`
      if (hudBarFill) hudBarFill.scale.x = Math.max(0.001, Math.min(1, progress / M.distance))
    },

    teardown(app: Application) {
      if (tick) app.ticker.remove(tick)
      tick = null
      clearParticles()
      board?.destroy({ children: true })
      board = null
      scene = null
      air = null
      actors = null
      fx = null
      overlay = null
      cham = null
      tokenShadow = null
      question = null
      goal = null
      goalGlow = null
      sparkles = []
      trailMask = null
      hudPanel = null
      hudText = null
      hudBarFill = null
      ambText = null
      alert = null
      vignetteG = null
      rays = null
      marks = []
      sways = []
      motes = []
      drifters = []
      twinklers = []
      savedInit = null
      celebrating = false
      dustAt = -1
    },
  }
}
