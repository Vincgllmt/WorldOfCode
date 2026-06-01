'use client'

import type { RequestSessionSummary } from '@/types/mentoring'

const FORMAT_LABELS: Record<string, string> = {
  text: '💬 Texte',
  video: '📹 Vidéo',
  hybrid: '🔀 Hybride',
}

interface Props {
  title: string
  techStack: string
  session: RequestSessionSummary
}

export default function AcceptedRequestCard({ title, techStack, session }: Props) {
  return (
    <div className="border border-green-500/50 bg-green-50/50 dark:bg-green-900/10 rounded-xl p-4">
      {/* Header — AC 4 : texte + icône, pas uniquement couleur */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm truncate">{title}</h3>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
          <span aria-hidden="true">✓</span>
          <span>Acceptée</span>
        </span>
      </div>

      {/* Infos mentor — AC 2 */}
      <div className="flex items-center gap-3 p-3 bg-background/60 rounded-lg">
        <div
          className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary select-none"
          aria-hidden="true"
        >
          {session.mentor.username[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-sm">{session.mentor.username}</p>
          <p className="text-xs text-muted-foreground">Votre mentor</p>
        </div>
        <span className="ml-auto text-xs bg-muted px-2 py-0.5 rounded-full">
          {FORMAT_LABELS[session.format] ?? session.format}
        </span>
      </div>

      {/* Lien chat — AC 2 */}
      <div className="mt-3">
        {session.conversationId ? (
          <a
            href={`/message/${session.conversationId}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            <span aria-hidden="true">💬</span>
            Ouvrir le chat
          </a>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-2">
            Session créée. Le lien chat sera ajouté par votre mentor.
          </p>
        )}
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{techStack}</p>
    </div>
  )
}
