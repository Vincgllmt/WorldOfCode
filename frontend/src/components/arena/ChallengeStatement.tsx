'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

/**
 * Rendu de l'énoncé d'un défi (markdown léger, sans dépendance).
 *
 * Sous-ensemble markdown volontairement restreint mais suffisant pour les
 * énoncés de l'arène — pensé pour être réutilisé tel quel par tous les futurs
 * jeux : titres (`#`..`######`), paragraphes, listes ordonnées/non ordonnées,
 * code inline (`` `…` ``), blocs de code (clôturés ``` ``` ``` ou indentés de
 * 4 espaces), **gras**, *italique* et liens `[texte](url)`.
 *
 * Par défaut le premier titre `# H1` est masqué : par convention l'énoncé
 * répète le titre du défi (déjà affiché au-dessus dans l'en-tête).
 */

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'code'; text: string; lang?: string }
  | { kind: 'list'; ordered: boolean; items: string[] }

const RE_FENCE = /^```/
const RE_INDENT = /^(?: {4}|\t)/
const RE_HEADING = /^(#{1,6})\s+(.*)$/
const RE_LIST = /^\s*(?:[-*+]|\d+[.)])\s+/
const RE_ORDERED = /^\s*\d+[.)]\s+/

/* Découpe l'énoncé en blocs de haut niveau. */
function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Ligne vide → séparateur, on ignore.
    if (line.trim() === '') {
      i++
      continue
    }

    // Bloc de code clôturé : ```lang … ```
    if (RE_FENCE.test(line.trim())) {
      const lang = line.trim().slice(3).trim() || undefined
      i++
      const buf: string[] = []
      while (i < lines.length && !RE_FENCE.test(lines[i].trim())) {
        buf.push(lines[i])
        i++
      }
      i++ // saute la clôture
      blocks.push({ kind: 'code', text: buf.join('\n'), lang })
      continue
    }

    // Bloc de code indenté (4 espaces ou tabulation).
    if (RE_INDENT.test(line)) {
      const buf: string[] = []
      while (i < lines.length && RE_INDENT.test(lines[i])) {
        buf.push(lines[i].replace(RE_INDENT, ''))
        i++
      }
      blocks.push({ kind: 'code', text: buf.join('\n') })
      continue
    }

    // Titre : #, ##, …
    const h = RE_HEADING.exec(line)
    if (h) {
      blocks.push({ kind: 'heading', level: h[1].length, text: h[2].trim() })
      i++
      continue
    }

    // Liste (ordonnée ou non).
    if (RE_LIST.test(line)) {
      const ordered = RE_ORDERED.test(line)
      const items: string[] = []
      while (i < lines.length && RE_LIST.test(lines[i])) {
        items.push(lines[i].replace(RE_LIST, ''))
        i++
      }
      blocks.push({ kind: 'list', ordered, items })
      continue
    }

    // Paragraphe : on agrège jusqu'à une ligne vide ou un autre bloc.
    const buf: string[] = []
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !RE_HEADING.test(lines[i]) &&
      !RE_FENCE.test(lines[i].trim()) &&
      !RE_INDENT.test(lines[i]) &&
      !RE_LIST.test(lines[i])
    ) {
      buf.push(lines[i])
      i++
    }
    // Les retours à la ligne « doux » deviennent une espace (markdown standard).
    blocks.push({ kind: 'paragraph', text: buf.join(' ') })
  }

  return blocks
}

const RE_INLINE =
  /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(_[^_]+_)|(\[[^\]]+\]\([^)]+\))/g

/* Applique le formatage inline (code, gras, italique, liens) sur un fragment. */
function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let last = 0
  let key = 0
  let m: RegExpExecArray | null

  RE_INLINE.lastIndex = 0
  while ((m = RE_INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    const tok = m[0]

    if (tok.startsWith('`')) {
      nodes.push(
        <code
          key={key++}
          className="rounded-md bg-[#EAF2EC] px-1.5 py-0.5 font-mono text-[12.5px] font-medium text-[#0B7A3E]"
        >
          {tok.slice(1, -1)}
        </code>,
      )
    } else if (tok.startsWith('**')) {
      nodes.push(
        <strong key={key++} className="font-bold text-[#15241C]">
          {tok.slice(2, -2)}
        </strong>,
      )
    } else if (tok.startsWith('*') || tok.startsWith('_')) {
      nodes.push(
        <em key={key++} className="italic">
          {tok.slice(1, -1)}
        </em>,
      )
    } else {
      // Lien [texte](url)
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok)
      if (link) {
        nodes.push(
          <a
            key={key++}
            href={link[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#0E9F4A] underline underline-offset-2 hover:text-[#0B8F45]"
          >
            {link[1]}
          </a>,
        )
      } else {
        nodes.push(tok)
      }
    }
    last = RE_INLINE.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))

  return nodes
}

const HEADING_CLASS: Record<number, string> = {
  1: 'mt-6 mb-2 text-xl font-extrabold tracking-tight text-[#15241C]',
  2: 'mt-7 mb-2 text-[12px] font-bold uppercase tracking-[.07em] text-[#0E9F4A]',
  3: 'mt-5 mb-1.5 text-[15px] font-bold text-[#15241C]',
}

function renderBlock(block: Block, key: number): React.ReactNode {
  switch (block.kind) {
    case 'heading': {
      const Tag = `h${Math.min(block.level, 6)}` as 'h1'
      return (
        <Tag key={key} className={HEADING_CLASS[block.level] ?? HEADING_CLASS[3]}>
          {renderInline(block.text)}
        </Tag>
      )
    }
    case 'paragraph':
      return (
        <p key={key} className="mt-3.5 text-[14.5px] leading-relaxed text-[#3A453F]">
          {renderInline(block.text)}
        </p>
      )
    case 'code':
      return (
        <pre
          key={key}
          className="mt-3.5 overflow-x-auto rounded-xl border border-[#E2EAE5] bg-white p-3.5 font-mono text-[12.5px] leading-relaxed text-[#15241C]"
        >
          <code>{block.text}</code>
        </pre>
      )
    case 'list': {
      const Tag = block.ordered ? 'ol' : 'ul'
      return (
        <Tag
          key={key}
          className={cn(
            'mt-3.5 space-y-1.5 pl-5 text-[14.5px] leading-relaxed text-[#3A453F] marker:text-[#0E9F4A]',
            block.ordered ? 'list-decimal' : 'list-disc',
          )}
        >
          {block.items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </Tag>
      )
    }
  }
}

export interface ChallengeStatementProps {
  readonly statement: string
  /** Masque le premier titre H1 (déjà affiché dans l'en-tête). Défaut : true. */
  readonly hideLeadingTitle?: boolean
  readonly className?: string
}

export default function ChallengeStatement({
  statement,
  hideLeadingTitle = true,
  className,
}: ChallengeStatementProps) {
  const blocks = useMemo(() => {
    const parsed = parseBlocks(statement ?? '')
    const first = parsed[0]
    if (hideLeadingTitle && first?.kind === 'heading' && first.level === 1) {
      return parsed.slice(1)
    }
    return parsed
  }, [statement, hideLeadingTitle])

  return (
    <div className={cn('[&>*:first-child]:mt-0', className)}>
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  )
}
