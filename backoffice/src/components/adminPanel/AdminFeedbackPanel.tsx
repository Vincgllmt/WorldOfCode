'use client'

import { useState, useMemo } from 'react'
import { Star } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAdminFeedbacks, useUpdateFeedbackStatus } from '@/hooks/useAdminFeedbacks'
import { AdminFeedback } from '@/interfaces/adminFeedback'

type StatusFilter = 'all' | 'new' | 'read' | 'processed'

const STATUS_LABELS: Record<AdminFeedback['status'], string> = {
  new: 'Nouveau',
  read: 'Lu',
  processed: 'Traité',
}

const STATUS_CLASSES: Record<AdminFeedback['status'], string> = {
  new: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  read: 'bg-muted text-muted-foreground',
  processed: 'bg-green-500/10 text-green-600 dark:text-green-400',
}

function Stars({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < score ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
        />
      ))}
    </span>
  )
}

function NpsBadge({ score }: { score: number }) {
  const color =
    score >= 9 ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
    score >= 7 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
    'bg-red-500/10 text-red-600 dark:text-red-400'
  return (
    <span className={`inline-flex items-center justify-center h-6 w-7 rounded text-xs font-bold ${color}`}>
      {score}
    </span>
  )
}

function MetricCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  )
}

export default function AdminFeedbackPanel() {
  const { feedbacks, isLoading, error } = useAdminFeedbacks()
  const { mutate: updateStatus, isPending } = useUpdateFeedbackStatus()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selected, setSelected] = useState<AdminFeedback | null>(null)

  const filtered = useMemo(() =>
    statusFilter === 'all' ? feedbacks : feedbacks.filter(f => f.status === statusFilter),
    [feedbacks, statusFilter]
  )

  const newCount = useMemo(() => feedbacks.filter(f => f.status === 'new').length, [feedbacks])

  const avgSatisfaction = useMemo(() => {
    if (!feedbacks.length) return '—'
    const avg = feedbacks.reduce((s, f) => s + f.overallSatisfaction, 0) / feedbacks.length
    return avg.toFixed(1)
  }, [feedbacks])

  const avgNps = useMemo(() => {
    if (!feedbacks.length) return '—'
    const avg = feedbacks.reduce((s, f) => s + f.npsScore, 0) / feedbacks.length
    return avg.toFixed(1)
  }, [feedbacks])

  const handleRowClick = (feedback: AdminFeedback) => {
    setSelected(feedback)
    if (feedback.status === 'new') {
      updateStatus({ id: feedback.id, status: 'read' })
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-destructive flex items-center gap-2"><span>⚠</span>{error}</p>
  }

  return (
    <div className="space-y-5">
      {/* Métriques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Total" value={feedbacks.length} />
        <MetricCard label="Non lus" value={newCount} sub={newCount > 0 ? 'à consulter' : 'tout à jour'} />
        <MetricCard label="Satisfaction moy." value={avgSatisfaction} sub="sur 5" />
        <MetricCard label="NPS moyen" value={avgNps} sub="sur 10" />
      </div>

      {/* Filtres */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['all', 'new', 'read', 'processed'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {s === 'all' ? 'Tous' : STATUS_LABELS[s]}
            {s === 'new' && newCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-blue-500 text-white text-[10px] font-bold">
                {newCount}
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
      </div>

      {/* Tableau */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Aucun feedback pour ce filtre.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Utilisateur</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Satisfaction</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">NPS</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Commentaire</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Statut</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr
                  key={f.id}
                  onClick={() => handleRowClick(f)}
                  className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{f.username}</td>
                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                    {new Date(f.createdAt).toLocaleDateString('fr-FR')}
                  </td>
                  <td className="px-4 py-3">
                    <Stars score={f.overallSatisfaction} />
                  </td>
                  <td className="px-4 py-3">
                    <NpsBadge score={f.npsScore} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[260px]">
                    {f.comment
                      ? <span className="line-clamp-1">{f.comment}</span>
                      : <span className="italic text-muted-foreground/50">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_CLASSES[f.status]}`}>
                      {STATUS_LABELS[f.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Panel détail — même pattern que le panel utilisateur */}
      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto border-border px-6">
          <SheetHeader className="border-b border-border pb-4 -mx-6 px-6">
            <SheetTitle className="text-base font-bold">Détail du feedback</SheetTitle>
          </SheetHeader>

          {selected && (
            <div className="py-5 space-y-6">
              {/* Utilisateur + date */}
              <div>
                <p className="font-semibold">{selected.username}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selected.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Statut + actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_CLASSES[selected.status]}`}>
                  {STATUS_LABELS[selected.status]}
                </span>
                {selected.status !== 'processed' && (
                  <button
                    onClick={() => updateStatus({ id: selected.id, status: 'processed' })}
                    disabled={isPending}
                    className="px-3 py-1 rounded-lg text-xs bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20 transition-colors disabled:opacity-50"
                  >
                    Marquer comme traité
                  </button>
                )}
                {selected.status === 'processed' && (
                  <button
                    onClick={() => updateStatus({ id: selected.id, status: 'new' })}
                    disabled={isPending}
                    className="px-3 py-1 rounded-lg text-xs bg-muted text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    Réouvrir
                  </button>
                )}
              </div>

              {/* Notes */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Notes</h3>
                <div className="rounded-xl border border-border divide-y divide-border">
                  {[
                    { label: 'Satisfaction globale', value: selected.overallSatisfaction },
                    { label: "Facilité d'utilisation", value: selected.easeOfUse },
                    { label: 'Qualité du contenu', value: selected.contentQuality },
                    ...(selected.messagingRating != null ? [{ label: 'Messagerie', value: selected.messagingRating }] : []),
                    ...(selected.groupsRating != null ? [{ label: 'Groupes', value: selected.groupsRating }] : []),
                    ...(selected.mentoringRating != null ? [{ label: 'Mentorat', value: selected.mentoringRating }] : []),
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between px-4 py-2.5">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <Stars score={value} />
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-muted-foreground">Score NPS</span>
                    <NpsBadge score={selected.npsScore} />
                  </div>
                </div>
              </div>

              {/* Commentaire */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Commentaire</h3>
                {selected.comment
                  ? <p className="text-sm leading-relaxed bg-muted/40 rounded-xl px-4 py-3">{selected.comment}</p>
                  : <p className="text-sm italic text-muted-foreground/50 bg-muted/40 rounded-xl px-4 py-3">Aucun commentaire.</p>
                }
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
