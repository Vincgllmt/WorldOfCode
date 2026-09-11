import { Container, Graphics } from 'pixi.js'

import type { ChameleonSkin } from './ambiance'
import { mix } from './ambiance'

/**
 * Caméléon de profil, dessiné en vectoriel.
 *
 * Le sprite partagé avec le labyrinthe est une vue **de dessus** : pivoté dans une
 * scène vue de côté, il ressemblait à une grenouille. Ici tout est construit de
 * profil — corps comprimé latéralement, crête dorsale, casque, œil en tourelle,
 * queue préhensile enroulée et pattes zygodactyles qui agrippent la branche.
 *
 * Les pièces sont dessinées une fois puis animées par transformations (rotation des
 * cuisses et des tibias, balancement du corps, rotation de la pupille) : aucun
 * redessin par frame.
 *
 * Repère local : les pattes posent en `y = 0`, le caméléon regarde vers les x
 * croissants, et le corps mesure 100 unités de long. Cette échelle généreuse n'est
 * pas cosmétique : Pixi pave les courbes dans le repère où elles sont décrites, donc
 * dessiner en unités minuscules puis agrandir donnerait des cercles en losange.
 * À l'appelant de fixer `root.scale` à `taille / 100`.
 */
export interface Chameleon {
  root: Container
  /** Lance ou arrête le cycle de marche. */
  setWalking(on: boolean): void
  /** Oriente la pupille vers une direction (vecteur quelconque, non normalisé). */
  look(dx: number, dy: number): void
  /** Regard perdu : l'œil balaye au hasard (ordre incompris, fraise manquée). */
  setConfused(on: boolean): void
  /** Fait avancer les animations propres du caméléon. */
  update(dtMs: number): void
}

/** Longueur du corps dans le repère local : voir la note d'échelle ci-dessus. */
export const CHAMELEON_UNIT = 100

const TAU = Math.PI * 2

type Pt = [number, number]

/** Point d'une courbe quadratique de Bézier. */
function quadAt(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const u = 1 - t
  return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]
}

/** Tangente (non normalisée) de la même courbe. */
function quadTangent(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  return [2 * (1 - t) * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]), 2 * (1 - t) * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1])]
}

/** Assombrit (t < 0) ou éclaircit (t > 0) une couleur. */
const shade = (color: number, t: number) => (t < 0 ? mix(color, 0x000000, -t) : mix(color, 0xffffff, t))

/** Membre fuselé : un fuseau qui va de (0,0) à (0,len), large en haut, fin en bas. */
function limb(len: number, wTop: number, wBot: number, color: number, edge: number): Graphics {
  return new Graphics()
    .moveTo(-wTop, 0)
    .quadraticCurveTo(-wTop * 1.2, len * 0.55, -wBot, len)
    .lineTo(wBot, len)
    .quadraticCurveTo(wTop * 1.2, len * 0.55, wTop, 0)
    .closePath()
    .fill(color)
    .stroke({ color: edge, width: 1.6, alpha: 0.6 })
}

/** Pied zygodactyle : deux paquets d'orteils opposés, qui pincent la branche. */
function foot(color: number, edge: number): Graphics {
  const g = new Graphics()
  g.ellipse(6, 2.5, 7.5, 3.8).fill(color).stroke({ color: edge, width: 1.4, alpha: 0.5 })
  g.ellipse(-5, 2.5, 6.2, 3.6).fill(color).stroke({ color: edge, width: 1.4, alpha: 0.5 })
  g.ellipse(0, -1, 5, 4.4).fill(color)
  return g
}

/**
 * Une patte = cuisse pivotant à la hanche + tibia pivotant au genou + pied.
 * On rend les deux conteneurs pour pouvoir les faire tourner indépendamment.
 */
function leg(color: number, edge: number) {
  const thighLen = 20
  const shinLen = 17

  const hip = new Container()
  hip.addChild(limb(thighLen, 7.5, 5, color, edge))

  const knee = new Container()
  knee.position.set(0, thighLen)
  knee.addChild(limb(shinLen, 5.4, 3.6, color, edge))

  const f = foot(color, edge)
  f.position.set(0, shinLen)
  knee.addChild(f)

  hip.addChild(knee)
  return { hip, knee }
}

export function createChameleon(skin: ChameleonSkin): Chameleon {
  const edge = shade(skin.crest, -0.12)
  const far = shade(skin.skin, -0.32)
  const farEdge = shade(skin.crest, -0.34)

  const root = new Container()
  // `rig` porte tout le corps : c'est lui qui se balance, pour que les pattes
  // restent solidaires du reste pendant la marche.
  const rig = new Container()
  root.addChild(rig)

  // --- Queue enroulée --------------------------------------------------------------
  const tailC = new Container()
  tailC.position.set(-38, -40)
  {
    const g = new Graphics()
    const N = 30
    const pts: [number, number][] = []
    for (let i = 0; i <= N; i++) {
      const t = i / N
      const a = -0.5 + 1.4 * TAU * t
      const r = 27 * (1 - 0.74 * t)
      pts.push([Math.cos(a) * r, Math.sin(a) * r])
    }
    const [ox, oy] = pts[0]
    // Contour sombre d'abord, cœur coloré par-dessus : la queue se détache du fond.
    for (const pass of [0, 1]) {
      for (let i = 0; i < N; i++) {
        const t = i / N
        const w = 10 * Math.pow(1 - t, 0.85) + 1.6
        g.moveTo(pts[i][0] - ox, pts[i][1] - oy)
          .lineTo(pts[i + 1][0] - ox, pts[i + 1][1] - oy)
          .stroke({
            color: pass === 0 ? edge : mix(skin.skin, skin.crest, t * 0.55),
            width: pass === 0 ? w + 3 : w,
            cap: 'round',
          })
      }
    }
    tailC.addChild(g)
  }
  rig.addChild(tailC)

  // --- Pattes du côté opposé (plus sombres : elles sont dans l'ombre du corps) ------
  const legs: { hip: Container; knee: Container; phase: number }[] = []
  for (const [hx, hy, phase] of [[-20, -29, 0.5], [11, -33, 0]] as [number, number, number][]) {
    const l = leg(far, farEdge)
    l.hip.position.set(hx, hy)
    rig.addChild(l.hip)
    legs.push({ ...l, phase })
  }

  // --- Corps -----------------------------------------------------------------------
  const body = new Graphics()
  const bodyPath = (g: Graphics) =>
    g
      .moveTo(-40, -42)
      .quadraticCurveTo(-22, -71, 2, -67)
      .quadraticCurveTo(20, -64, 32, -54)
      .quadraticCurveTo(38, -44, 28, -34)
      .quadraticCurveTo(5, -20, -18, -26)
      .quadraticCurveTo(-34, -30, -40, -42)
  bodyPath(body).closePath().fill(skin.skin).stroke({ color: edge, width: 2.4 })
  // Selle plus foncée le long du dos, ventre plus clair : un peu de volume.
  body
    .moveTo(-36, -46)
    .quadraticCurveTo(-20, -70, 2, -66)
    .quadraticCurveTo(18, -63, 28, -55)
    .quadraticCurveTo(12, -50, -8, -50)
    .quadraticCurveTo(-26, -50, -36, -46)
    .closePath()
    .fill({ color: shade(skin.skin, -0.28), alpha: 0.7 })
  body
    .moveTo(26, -35)
    .quadraticCurveTo(4, -21, -18, -26)
    .quadraticCurveTo(-2, -33, 26, -35)
    .closePath()
    .fill({ color: skin.belly, alpha: 0.95 })
  // Bandes verticales du flanc, très discrètes.
  for (let i = 0; i < 4; i++) {
    const x = -24 + i * 14
    body
      .moveTo(x, -60 + i * 1.5)
      .quadraticCurveTo(x + 3, -44, x - 1, -30)
      .stroke({ color: shade(skin.skin, -0.24), width: 3, alpha: 0.38 })
  }
  // Rangée de pastilles claires le long du flanc.
  for (let i = 0; i < 5; i++) {
    const t = i / 4
    body.ellipse(-28 + t * 50, -47 + Math.sin(t * 3) * 3, 3.4, 2.6).fill({ color: skin.spot, alpha: 0.75 })
  }
  // Crête dorsale : les dents sont posées sur la courbe du dos elle-même et
  // orientées selon sa normale, sinon elles flottent au-dessus de la silhouette.
  const back: [Pt, Pt, Pt][] = [
    [[-40, -42], [-22, -71], [2, -67]],
    [[2, -67], [20, -64], [32, -54]],
  ]
  const teeth = [
    ...[0.2, 0.35, 0.5, 0.63, 0.75, 0.86, 0.96].map((t) => [0, t] as const),
    ...[0.12, 0.34].map((t) => [1, t] as const),
  ]
  teeth.forEach(([seg, t], i) => {
    const [p0, c, p1] = back[seg]
    const [x, y] = quadAt(p0, c, p1, t)
    const [tx, ty] = quadTangent(p0, c, p1, t)
    const n = Math.hypot(tx, ty) || 1
    // Normale dirigée vers l'extérieur du dos (vers le haut).
    const nx = ty / n
    const ny = -tx / n
    const h = 5 + Math.sin((i / (teeth.length - 1)) * Math.PI) * 5
    const bx = (-ty / n) * 3.4
    const by = (tx / n) * 3.4
    body
      .moveTo(x - bx, y - by)
      .lineTo(x + nx * h, y + ny * h)
      .lineTo(x + bx, y + by)
      .closePath()
      .fill(skin.crest)
  })
  rig.addChild(body)

  // --- Tête (pivote au cou) ---------------------------------------------------------
  const headC = new Container()
  headC.position.set(26, -54)
  const head = new Graphics()
  // Le remplissage mord sur le corps ; le contour, lui, ne suit que la silhouette
  // visible — sinon une couture traverserait le cou.
  head
    .moveTo(-14, 6)
    .quadraticCurveTo(-8, -22, 8, -20)
    .quadraticCurveTo(26, -15, 37, 2)
    .quadraticCurveTo(29, 13, 9, 17)
    .quadraticCurveTo(-6, 17, -14, 6)
    .closePath()
    .fill(skin.skin)
  head
    .moveTo(-6, -14)
    .quadraticCurveTo(-8, -22, 8, -20)
    .quadraticCurveTo(26, -15, 37, 2)
    .quadraticCurveTo(29, 13, 9, 17)
    .quadraticCurveTo(-1, 17, -5, 12)
    .stroke({ color: edge, width: 2.4 })
  // Casque, fente de la bouche, narine.
  head
    .moveTo(-5, -12)
    .quadraticCurveTo(-6, -22, 8, -20)
    .quadraticCurveTo(13, -13, 2, -6)
    .closePath()
    .fill({ color: skin.crest, alpha: 0.9 })
  head.moveTo(37, 3).quadraticCurveTo(22, 9, 8, 7).stroke({ color: edge, width: 2, alpha: 0.85 })
  head.circle(31, -2, 1.7).fill({ color: edge, alpha: 0.8 })
  const headArt = new Container()
  headArt.scale.set(0.92)
  headArt.addChild(head)

  // Œil en tourelle : dôme de peau, anneau, iris, pupille mobile.
  const eyeC = new Container()
  eyeC.position.set(11, -3)
  eyeC.addChild(new Graphics().circle(0, 0, 11).fill(skin.skin).stroke({ color: edge, width: 2.2 }))
  eyeC.addChild(new Graphics().circle(0, 0, 7.6).fill(skin.crest))
  const eyeBall = new Container()
  eyeBall.addChild(new Graphics().circle(0, 0, 5.7).fill(skin.eye))
  const pupilC = new Container()
  pupilC.addChild(new Graphics().circle(0, 0, 2.5).fill(0x120c06))
  eyeBall.addChild(pupilC)
  eyeC.addChild(eyeBall)
  // Reflet, posé après la pupille pour rester au-dessus.
  eyeC.addChild(new Graphics().circle(-2, -2.4, 1.8).fill({ color: 0xffffff, alpha: 0.85 }))
  headArt.addChild(eyeC)
  headC.addChild(headArt)
  rig.addChild(headC)

  // --- Pattes du côté visible -------------------------------------------------------
  for (const [hx, hy, phase] of [[-17, -28, 0], [16, -33, 0.5]] as [number, number, number][]) {
    const l = leg(skin.skin, edge)
    l.hip.position.set(hx, hy)
    rig.addChild(l.hip)
    legs.push({ ...l, phase })
  }

  // --- Animation --------------------------------------------------------------------
  let walking = false
  let confused = false
  let walkT = 0
  let time = 0
  let blinkAt = 2600
  let blinkT = -1
  let lookX = 1
  let lookY = 0

  const setLegs = () => {
    for (const l of legs) {
      const a = (walkT + l.phase) * TAU
      // Au repos les pattes restent plantées, à peine fléchies.
      const swing = walking ? 1 : 0
      l.hip.rotation = Math.sin(a) * 0.5 * swing
      l.knee.rotation = 0.26 + Math.max(0, Math.cos(a)) * 0.55 * swing
    }
  }
  setLegs()

  return {
    root,

    setWalking(on: boolean) {
      walking = on
    },

    look(dx: number, dy: number) {
      const n = Math.hypot(dx, dy) || 1
      lookX = dx / n
      lookY = dy / n
    },

    setConfused(on: boolean) {
      confused = on
    },

    update(dtMs: number) {
      time += dtMs
      if (walking) walkT = (walkT + dtMs * 0.0022) % 1

      setLegs()

      // Balancement caractéristique : le caméléon avance en se dandinant.
      if (walking) {
        rig.x = Math.sin(walkT * TAU * 2) * 2.2
        rig.y = -Math.abs(Math.sin(walkT * TAU * 2)) * 1.4
      } else {
        rig.x = 0
        rig.y = Math.sin(time * 0.0018) * 0.7 // respiration
      }

      // La queue se déroule un peu à la marche, et ondule doucement au repos.
      tailC.rotation = Math.sin(time * (walking ? 0.006 : 0.0016)) * (walking ? 0.14 : 0.07)

      // La tête suit mollement la direction du regard.
      headC.rotation = confused
        ? Math.sin(time * 0.009) * 0.12
        : Math.max(-0.2, Math.min(0.2, lookY * 0.35)) + Math.sin(time * 0.0014) * 0.02

      // Pupille : elle vise la cible, ou balaye au hasard quand le caméléon est perdu.
      const px = confused ? Math.cos(time * 0.011) : lookX
      const py = confused ? Math.sin(time * 0.007) : lookY
      pupilC.position.set(px * 2, py * 2)

      // Clignement : rare, court, et l'œil se referme d'un coup.
      if (blinkT < 0 && time > blinkAt) blinkT = 0
      if (blinkT >= 0) {
        blinkT += dtMs
        const u = blinkT / 130
        eyeBall.scale.y = u >= 1 ? 1 : 1 - Math.sin(u * Math.PI) * 0.92
        if (u >= 1) {
          blinkT = -1
          blinkAt = time + 2400 + Math.random() * 3200
        }
      }
    },
  }
}
