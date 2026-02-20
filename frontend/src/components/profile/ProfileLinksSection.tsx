import { LINK_CONFIG } from '@/lib/profile-constants'
import type { UserLink } from '@/interfaces/user'
import { ExternalLink } from 'lucide-react'

type ProfileLinksSectionProps = {
  links: UserLink[] | undefined | null
}

export default function ProfileLinksSection({ links }: ProfileLinksSectionProps) {
  if (!links || links.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun lien renseigné.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((link) => {
        const config = LINK_CONFIG[link.type] ?? LINK_CONFIG.other
        const Icon = config.icon

        return (
          <a
            key={link.id}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            title={config.label}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-muted/40 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
          >
            <Icon className="h-4 w-4" />
            <span>{config.label}</span>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </a>
        )
      })}
    </div>
  )
}
