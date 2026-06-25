'use client'

import { useState } from 'react'
import { Search, Star } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAdminMentors, useAdminMentorDetail } from '@/hooks/useAdminMentors'

const TEACHING_STYLE_LABELS: Record<string, string> = {
  guided:        'Guide sans donner les réponses',
  direct:        'Explications directes',
  socratic:      'Méthode socratique',
  collaborative: 'Travail collaboratif',
}

function Stars({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-muted-foreground/50 italic">—</span>
  const rounded = Math.round(score)
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`h-3 w-3 ${i < rounded ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{score.toFixed(1)}</span>
    </span>
  )
}

function StatBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

export default function AdminMentorPanel() {
  const [search, setSearch]               = useState('')
  const [availFilter, setAvailFilter]     = useState<boolean | undefined>(undefined)
  const [selectedId, setSelectedId]       = useState<number | null>(null)

  const { mentors, isLoading, error } = useAdminMentors({
    q: search || undefined,
    isAvailable: availFilter,
  })
  const { detail, isLoading: loadingDetail } = useAdminMentorDetail(selectedId)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive flex items-center gap-2"><span>⚠</span>{error}</p>
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche + filtre disponibilité */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un mentor…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>
        <div className="flex items-center gap-2">
          {([
            { label: 'Tous', value: undefined },
            { label: 'Disponibles', value: true },
            { label: 'Indisponibles', value: false },
          ] as const).map(opt => (
            <button
              key={String(opt.value)}
              onClick={() => setAvailFilter(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                availFilter === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">{mentors.length} mentor{mentors.length > 1 ? 's' : ''}</span>
      </div>

      {/* Tableau */}
      {mentors.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Aucun mentor trouvé.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Mentor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Spécialités</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Note moy.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Sessions</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Fiabilité</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {mentors.map(m => (
                <tr
                  key={m.id}
                  onClick={() => setSelectedId(m.id)}
                  className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                        {m.username[0]?.toUpperCase()}
                      </div>
                      <span className="font-medium">{m.username}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {m.specialties.slice(0, 3).map(s => (
                        <span key={s} className="px-1.5 py-0.5 text-[11px] rounded bg-muted text-muted-foreground">{s}</span>
                      ))}
                      {m.specialties.length > 3 && (
                        <span className="px-1.5 py-0.5 text-[11px] rounded bg-muted text-muted-foreground">+{m.specialties.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Stars score={m.averageRating} />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{m.totalSessions}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-muted-foreground">
                    {m.reliabilityRate !== null ? `${Math.round(m.reliabilityRate)}%` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      m.isAvailable
                        ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {m.isAvailable ? 'Disponible' : 'Indisponible'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Panel détail */}
      <Sheet open={!!selectedId} onOpenChange={open => { if (!open) setSelectedId(null) }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto border-border px-6">
          <SheetHeader className="border-b border-border pb-4 -mx-6 px-6">
            <SheetTitle className="text-base font-bold">Profil mentor</SheetTitle>
          </SheetHeader>

          {loadingDetail ? (
            <div className="py-8 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : detail && (
            <div className="py-5 space-y-6">
              {/* Identité */}
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                  {detail.username[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{detail.username}</p>
                  <p className="text-xs text-muted-foreground">{detail.email}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Mentor depuis le {new Date(detail.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Disponibilité */}
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                detail.isAvailable
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {detail.isAvailable ? 'Disponible' : 'Indisponible'}
              </span>

              {/* Stats */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Statistiques</h3>
                <div className="grid grid-cols-3 gap-3">
                  <StatBlock label="Sessions totales" value={detail.totalSessions} />
                  <StatBlock label="Sessions actives" value={detail.activeSessions} />
                  <StatBlock label="Mentorés aidés" value={detail.totalMentees} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <StatBlock
                    label="Note moyenne"
                    value={detail.averageRating !== null ? `${detail.averageRating.toFixed(1)} / 5` : '—'}
                  />
                  <StatBlock
                    label="Taux de fiabilité"
                    value={detail.reliabilityRate !== null ? `${Math.round(detail.reliabilityRate)}%` : '—'}
                  />
                </div>
              </div>

              {/* Spécialités */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Spécialités</h3>
                <div className="flex flex-wrap gap-1.5">
                  {detail.specialties.length > 0
                    ? detail.specialties.map(s => (
                        <span key={s} className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary font-medium">{s}</span>
                      ))
                    : <span className="text-sm italic text-muted-foreground/50">Aucune spécialité renseignée.</span>
                  }
                </div>
              </div>

              {/* Profil pédagogique */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Profil pédagogique</h3>
                <div className="rounded-xl border border-border divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">Style</span>
                    <span className="text-sm font-medium">
                      {detail.teachingStyle ? TEACHING_STYLE_LABELS[detail.teachingStyle] ?? detail.teachingStyle : '—'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">Mentorés max</span>
                    <span className="text-sm font-medium">{detail.maxActiveMentees}</span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              {detail.mentorBio && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Bio</h3>
                  <p className="text-sm leading-relaxed bg-muted/40 rounded-xl px-4 py-3">{detail.mentorBio}</p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
