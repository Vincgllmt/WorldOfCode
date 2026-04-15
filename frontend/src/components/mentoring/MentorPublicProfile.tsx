'use client'

import type { MentorProfile } from '@/types/mentoring'

function StarDisplay({ rating, total }: { rating: number; total: number }) {
  const fullStars = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.25 && rating % 1 < 0.75
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalf ? 1 : 0))

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex" role="img" aria-label={`Note : ${rating.toFixed(1)} sur 5`}>
        {Array(fullStars).fill(0).map((_, i) => (
          <span key={`full-${i}`} className="text-yellow-400" aria-hidden="true">★</span>
        ))}
        {hasHalf && <span className="text-yellow-400 opacity-60" aria-hidden="true">★</span>}
        {Array(emptyStars).fill(0).map((_, i) => (
          <span key={`empty-${i}`} className="text-muted-foreground/30" aria-hidden="true">★</span>
        ))}
      </div>
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({total} session{total > 1 ? 's' : ''})</span>
    </div>
  )
}

const TEACHING_STYLE_LABELS: Record<string, string> = {
  guided: 'Guide sans donner les réponses',
  direct: 'Explications directes',
  socratic: 'Méthode socratique',
  collaborative: 'Travail collaboratif',
}

interface Props {
  profile: MentorProfile
  userId: number
}

export default function MentorPublicProfile({ profile }: Props) {
  return (
    <section className="border border-border rounded-xl p-6 mt-6" aria-label="Profil Mentor">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Profil Mentor</h2>
        {profile.isAvailable ? (
          <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
            <span aria-hidden="true">●</span> Disponible
          </span>
        ) : (
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <span aria-hidden="true">○</span> Mode Lecture
          </span>
        )}
      </div>

      {/* Spécialités */}
      {profile.specialties.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {profile.specialties.map(s => (
            <span key={s.id} className="px-2 py-0.5 bg-muted text-xs rounded-full">
              {s.name}
            </span>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 text-center mb-4">
        <div>
          <p className="text-2xl font-bold">{profile.totalSessions}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          {profile.averageRating !== null ? (
            <StarDisplay rating={profile.averageRating} total={profile.totalSessions} />
          ) : (
            <span className="text-muted-foreground text-sm">Aucune note</span>
          )}
          <p className="text-xs text-muted-foreground">Note</p>
        </div>
        <div>
          <p className="text-2xl font-bold">
            {profile.reliabilityRate !== null
              ? `${Math.round(profile.reliabilityRate * 100)}%`
              : '—'}
          </p>
          <p className="text-xs text-muted-foreground">Fiabilité</p>
        </div>
      </div>

      {/* Style pédagogique */}
      {profile.teachingStyle && (
        <p className="text-sm text-muted-foreground">
          Style : {TEACHING_STYLE_LABELS[profile.teachingStyle] ?? profile.teachingStyle}
        </p>
      )}
    </section>
  )
}
