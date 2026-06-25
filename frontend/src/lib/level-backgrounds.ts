/**
 * Mapping niveau → fond de bandeau.
 *
 * L'app ne fait qu'AFFICHER un artefact fini. La production (IA, découpage,
 * rigging, animation Rive) se fait hors app ; ici on se contente de pointer
 * vers le fichier déposé dans `public/backgrounds/` et de fournir un dégradé
 * de secours tant qu'aucun fichier n'est produit.
 *
 * Format agnostique : `file` peut être un .riv (animé/interactif), un
 * .webm/.mp4 (vidéo) ou un .png/.jpg/.webp/.svg (image). Le kind est déduit
 * de l'extension par `backgroundKind()`.
 *
 * Ajouter / changer un fond = éditer ce fichier + déposer l'asset.
 * Aucune touche au composant `LevelBackground`.
 */

export type BackgroundKind = 'rive' | 'video' | 'svg' | 'image' | 'gradient'

export interface LevelBackground {
  /** Fichier dans `public/backgrounds/` (ex: "niveau-10.riv"). Absent ⇒ dégradé seul. */
  file?: string
  /** Nom de thème affiché (ex: "Aurore cosmique"). */
  theme: string
  /** Petit label de statut (ex: "Animé · parallaxe"). Optionnel. */
  label?: string
  /** Dégradé de secours, toujours rendu en couche de base (jamais de vide). */
  gradient: string
}

/** Dégradé par défaut si un niveau n'est pas déclaré ci-dessous. */
export const DEFAULT_GRADIENT =
  'linear-gradient(120deg,#0A9245 0%,#13AE54 50%,#1FC465 100%)'

/**
 * Un fond par palier. Les `file` sont volontairement absents pour l'instant :
 * le dégradé sert de placeholder. Dès que tu produis un `.riv`/`.webm`/image,
 * tu ajoutes `file: 'niveau-XX.riv'` et il prend le dessus automatiquement.
 */
export const LEVEL_BACKGROUNDS: Record<number, LevelBackground> = {
  1: {
    theme: 'Première pousse',
    label: 'Animé · démo',
    file: 'demo-anim.svg',
    gradient: 'linear-gradient(120deg,#0A9245 0%,#13AE54 50%,#1FC465 100%)',
  },
  2: { theme: 'Sentier vert', gradient: 'linear-gradient(120deg,#0B8F45 0%,#17A85C 50%,#2ECC72 100%)' },
  3: { theme: 'Canopée', gradient: 'linear-gradient(120deg,#0E7A50 0%,#12A24F 50%,#3DB06A 100%)' },
  4: { theme: 'Aube émeraude', gradient: 'linear-gradient(120deg,#0B7A4E 0%,#0FA07A 50%,#1FC79A 100%)' },
  5: { theme: 'Lagune', gradient: 'linear-gradient(120deg,#0C6E6A 0%,#0F9C8E 50%,#22C2A8 100%)' },
  6: { theme: 'Récif', gradient: 'linear-gradient(120deg,#0A5E78 0%,#0E84A8 50%,#23B4C2 100%)' },
  7: { theme: 'Crépuscule', gradient: 'linear-gradient(120deg,#0A3D78 0%,#3A4F9E 50%,#6A78C2 100%)' },
  8: { theme: 'Nébuleuse', gradient: 'linear-gradient(120deg,#1A1F5E 0%,#43308E 50%,#7A4FC2 100%)' },
  9: { theme: 'Voie lactée', gradient: 'linear-gradient(120deg,#141540 0%,#3A1F6E 50%,#6A2FB0 100%)' },
  10: {
    theme: 'Aurore cosmique',
    label: 'Animé · parallaxe',
    gradient: 'linear-gradient(120deg,#0B0E2A 0%,#2A1F5E 50%,#5E2F8E 100%)',
  },
}

/** Résout le fond d'un niveau (fallback dégradé par défaut si non déclaré). */
export function backgroundForLevel(level: number): LevelBackground {
  return LEVEL_BACKGROUNDS[level] ?? { theme: `Niveau ${level}`, gradient: DEFAULT_GRADIENT }
}

/** Déduit le type de rendu à partir de l'extension du fichier. */
export function backgroundKind(file?: string): BackgroundKind {
  if (!file) return 'gradient'
  const ext = file.split('.').pop()?.toLowerCase()
  if (ext === 'riv') return 'rive'
  if (ext === 'webm' || ext === 'mp4') return 'video'
  // Le SVG est inliné (pas via <img>) pour que ses animations CSS/SMIL tournent.
  if (ext === 'svg') return 'svg'
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'webp') return 'image'
  return 'gradient'
}

/** Chemin public de l'asset (sous `public/backgrounds/`). */
export function backgroundSrc(file: string): string {
  return `/backgrounds/${file}`
}
