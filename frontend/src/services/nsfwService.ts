'use client'

/**
 * Vérification NSFW (Not Safe For Work) côté navigateur via NSFW.js.
 * Le modèle est chargé une seule fois (singleton) et mis en cache.
 *
 * Catégories renvoyées par le modèle :
 *  - Drawing : dessins / illustrations non sexuelles
 *  - Hentai  : anime / manga sexualisé
 *  - Neutral : contenu standard
 *  - Porn    : pornographie explicite
 *  - Sexy    : suggestif (lingerie, bikini, etc.)
 *
 * NB : NSFW.js et TensorFlow.js sont chargés via CDN au runtime pour
 * éviter à Turbopack de devoir bundler ces très gros modules.
 */

type Prediction = { className: string; probability: number }
type NSFWJSModel = {
  classify: (img: HTMLImageElement) => Promise<Prediction[]>
}

const PORN_THRESHOLD = 0.4
const HENTAI_THRESHOLD = 0.4
const SEXY_THRESHOLD = 0.6
const COMBINED_THRESHOLD = 0.7

let modelPromise: Promise<NSFWJSModel> | null = null

/**
 * Charge le modèle NSFW.js une seule fois via esm.sh
 * (transforme n'importe quel package npm en ESM importable depuis le navigateur).
 *
 * On utilise `new Function` pour que Turbopack/Webpack ne tente pas de
 * résoudre/bundler l'URL au build time.
 */
/**
 * Sources CDN pour le module nsfwjs, par ordre de priorité.
 * Si l'une est indispo, on bascule sur la suivante.
 */
const NSFWJS_SOURCES = [
  'https://esm.sh/nsfwjs@4.3.0',
  'https://cdn.jsdelivr.net/npm/nsfwjs@4.3.0/+esm',
  'https://ga.jspm.io/npm:nsfwjs@4.3.0/dist/esm/index.js',
]

const SOURCE_TIMEOUT_MS = 8000

/**
 * Tente d'importer un module depuis une URL, avec timeout.
 */
async function importWithTimeout(url: string, timeoutMs: number): Promise<Record<string, unknown>> {
  const dynamicImport = new Function('url', 'return import(url)') as (
    url: string
  ) => Promise<Record<string, unknown>>

  return Promise.race([
    dynamicImport(url),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout (${timeoutMs}ms) on ${url}`)), timeoutMs)
    ),
  ])
}

/**
 * Charge le modèle NSFW.js avec fallback automatique sur plusieurs CDN.
 * Si tous les CDN échouent, l'erreur est propagée au caller (qui laisse
 * passer l'image pour ne pas bloquer l'UX).
 */
async function getModel(): Promise<NSFWJSModel> {
  if (!modelPromise) {
    modelPromise = (async () => {
      let lastError: unknown = null

      for (let i = 0; i < NSFWJS_SOURCES.length; i++) {
        const url = NSFWJS_SOURCES[i]
        try {
          console.log(`[NSFW] Tentative ${i + 1}/${NSFWJS_SOURCES.length} : ${url}`)
          const mod = await importWithTimeout(url, SOURCE_TIMEOUT_MS)

          // selon le CDN, `load` peut être sur l'export direct ou sur .default
          const loadFn =
            (mod.load as undefined | (() => Promise<NSFWJSModel>)) ||
            ((mod.default as { load?: () => Promise<NSFWJSModel> } | undefined)?.load)

          if (typeof loadFn !== 'function') {
            throw new Error(`nsfwjs.load not found on imported module from ${url}`)
          }

          console.log(`[NSFW] Module chargé depuis ${url}, chargement du modèle…`)
          const model = await loadFn()
          console.log('[NSFW] Modèle chargé avec succès !')
          return model
        } catch (err) {
          console.warn(`[NSFW] Échec sur ${url} :`, err)
          lastError = err
          // on continue avec le CDN suivant
        }
      }

      // tous les CDN ont échoué : on reset pour permettre une nouvelle tentative plus tard
      modelPromise = null
      throw lastError instanceof Error
        ? lastError
        : new Error('Tous les CDN nsfwjs sont indisponibles')
    })()
  }
  return modelPromise
}

/**
 * Charge une image dans un HTMLImageElement à partir d'un File.
 */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      resolve(img)
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(img.src)
      reject(err)
    }
    img.src = URL.createObjectURL(file)
  })
}

export type NsfwCheckResult = {
  /** True si l'image doit être bloquée (porn, hentai). */
  blocked: boolean
  /** Catégorie majoritaire si bloqué (Porn / Hentai / Sexy). */
  reason?: 'Porn' | 'Hentai' | 'Sexy'
  /** Score de la catégorie qui a déclenché le blocage. */
  score?: number
  /** Toutes les prédictions brutes du modèle. */
  predictions: Prediction[]
}

/**
 * Vérifie une image. Bloque si Porn ou Hentai dépasse le seuil.
 * Sexy est autorisé sous le seuil mais retourne `reason: 'Sexy'` pour info.
 */
export async function checkImageNSFW(file: File): Promise<NsfwCheckResult> {
  // Si pas dans un navigateur (SSR) ou pas de support, on laisse passer
  if (typeof window === 'undefined') {
    return { blocked: false, predictions: [] }
  }

  try {
    const model = await getModel()
    const img = await fileToImage(file)
    const predictions = await model.classify(img)

    const find = (cls: string) =>
      predictions.find((p) => p.className === cls)?.probability ?? 0

    const porn = find('Porn')
    const hentai = find('Hentai')
    const sexy = find('Sexy')
    const combined = porn + hentai + sexy

    // Log temporaire pour ajuster les seuils
    console.log('[NSFW] Scores:', {
      porn: porn.toFixed(3),
      hentai: hentai.toFixed(3),
      sexy: sexy.toFixed(3),
      combined: combined.toFixed(3),
      file: file.name,
    })

    if (porn >= PORN_THRESHOLD) {
      return { blocked: true, reason: 'Porn', score: porn, predictions }
    }
    if (hentai >= HENTAI_THRESHOLD) {
      return { blocked: true, reason: 'Hentai', score: hentai, predictions }
    }
    if (sexy >= SEXY_THRESHOLD) {
      return { blocked: true, reason: 'Sexy', score: sexy, predictions }
    }
    // Cas combiné : aucun score isolé élevé mais ensemble suspect
    if (combined >= COMBINED_THRESHOLD) {
      const max = Math.max(porn, hentai, sexy)
      const reason: 'Porn' | 'Hentai' | 'Sexy' =
        max === porn ? 'Porn' : max === hentai ? 'Hentai' : 'Sexy'
      return { blocked: true, reason, score: max, predictions }
    }

    return { blocked: false, predictions }
  } catch (err) {
    console.warn('[NSFW] Erreur de vérification, image laissée passer :', err)
    // En cas d'erreur de modèle, on ne bloque pas pour ne pas paralyser l'UX
    return { blocked: false, predictions: [] }
  }
}

/**
 * Renvoie un message d'erreur français lisible pour un résultat bloqué.
 */
export function getNsfwBlockMessage(result: NsfwCheckResult): string {
  if (!result.blocked) return ''
  switch (result.reason) {
    case 'Porn':
      return 'Image refusée : contenu pornographique détecté.'
    case 'Hentai':
      return 'Image refusée : contenu sexualisé détecté.'
    case 'Sexy':
      return 'Image refusée : contenu suggestif détecté.'
    default:
      return 'Image refusée : contenu inapproprié détecté.'
  }
}

/**
 * Pré-charge le modèle (à appeler en arrière-plan, optionnel).
 */
export function preloadNsfwModel(): void {
  void getModel().catch(() => {
    // ignore : sera réessayé au premier check
    modelPromise = null
  })
}
