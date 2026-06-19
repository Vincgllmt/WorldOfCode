'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Award } from 'lucide-react'
import { useUserBadges } from '@/hooks/useArenaChallenges'
import BadgeMedal from '@/components/arena/BadgeMedal'

type ProfileArenaBadgesProps = {
  userId: number
  isOwnProfile: boolean
}

const formatDate = (iso: string): string => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function ProfileArenaBadges({ userId, isOwnProfile }: ProfileArenaBadgesProps) {
  const { badges, isLoading, error } = useUserBadges(userId)

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Award className="h-4 w-4 text-muted-foreground" />
          Badges Arena
          {badges && badges.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {badges.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <p className="text-sm text-muted-foreground">Chargement des badges…</p>
        )}

        {error && (
          <p className="text-sm text-destructive">
            Impossible de charger les badges pour le moment.
          </p>
        )}

        {!isLoading && !error && badges && badges.length === 0 && (
          <p className="text-sm text-muted-foreground">
            {isOwnProfile
              ? "Aucun badge pour l'instant. Termine des défis dans l'Arena pour en gagner !"
              : 'Aucun badge gagné pour le moment.'}
          </p>
        )}

        {!isLoading && !error && badges && badges.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {badges.map((badge) => (
              <li
                key={badge.badgeId}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3"
              >
                <BadgeMedal slug={badge.challengeSlug} name={badge.name} icon={badge.icon} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{badge.name}</p>
                  {badge.description && (
                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                  )}
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                    {badge.challengeSlug}
                    {formatDate(badge.awardedAt) && ` · ${formatDate(badge.awardedAt)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
