'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

import { useAdminReports, useClaimReport, useResolveReport, useRejectReport } from '@/hooks/useAdminReports'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { AdminReport, ReportStatus } from '@/interfaces/adminReport'

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'

// ─── Badge de statut ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  PENDING:     { label: 'En attente', className: 'border-orange-400 text-orange-600 bg-orange-50' },
  IN_PROGRESS: { label: 'En cours',   className: 'border-blue-400 text-blue-600 bg-blue-50' },
  RESOLVED:    { label: 'Résolu',     className: 'border-green-400 text-green-600 bg-green-50' },
  REJECTED:    { label: 'Rejeté',     className: 'border-gray-400 text-gray-500 bg-gray-50' },
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return <Badge variant="outline" className={className}>{label}</Badge>
}

// ─── Cellule Actions ──────────────────────────────────────────────────────────

function ActionCell({
  report,
  currentUsername,
  onClaim,
  onResolve,
  onReject,
}: {
  report: AdminReport
  currentUsername: string
  onClaim: (id: number) => void
  onResolve: (id: number) => void
  onReject: (id: number) => void
}) {
  const { status, claimedByUsername } = report
  const isMyReport = claimedByUsername === currentUsername

  if (status === 'RESOLVED' || status === 'REJECTED') {
    return (
      <span className="text-xs text-muted-foreground">
        {status === 'RESOLVED' ? 'Post supprimé' : `Rejeté`}
      </span>
    )
  }

  if (status === 'PENDING') {
    return (
      <Button size="sm" variant="outline" onClick={() => onClaim(report.id)}>
        Prendre en charge
      </Button>
    )
  }

  // IN_PROGRESS
  if (isMyReport) {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="default" onClick={() => onResolve(report.id)}>
          Résoudre
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive border-destructive hover:bg-destructive/10"
          onClick={() => onReject(report.id)}
        >
          Rejeter
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled>
        Prendre en charge
      </Button>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        En cours par <strong>{claimedByUsername}</strong>
      </span>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminReportPanel() {
  const { reports, isLoading } = useAdminReports()
  const { user } = useAdminAuth()
  const currentUsername = user?.username ?? ''

  const claimMutation = useClaimReport()
  const resolveMutation = useResolveReport()
  const rejectMutation = useRejectReport()

  // Filtres (Story 4.5)
  const [filterStatus, setFilterStatus] = useState<ReportStatus | ''>('')
  const [filterReason, setFilterReason] = useState<string>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  // Sheet détail (Story 4.5)
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null)

  // AlertDialog résolution (Story 4.4)
  const [resolveTarget, setResolveTarget] = useState<{ id: number } | null>(null)
  const [resolveNote, setResolveNote] = useState('')

  // AlertDialog rejet (Story 4.4)
  const [rejectTarget, setRejectTarget] = useState<{ id: number } | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  // ─── Filtrage ───────────────────────────────────────────────────────────────

  const uniqueReasons = Array.from(
    new Set(reports.map((r) => r.reason).filter(Boolean) as string[])
  ).sort()

  const filteredReports = reports.filter((r) => {
    const matchesStatus = !filterStatus || r.status === filterStatus
    const matchesReason = !filterReason || r.reason === filterReason
    const matchesDateFrom = !filterDateFrom || r.createdAt.slice(0, 10) >= filterDateFrom
    const matchesDateTo = !filterDateTo || r.createdAt.slice(0, 10) <= filterDateTo
    return matchesStatus && matchesReason && matchesDateFrom && matchesDateTo
  })

  const selectedReport = selectedReportId
    ? reports.find((r) => r.id === selectedReportId) ?? null
    : null

  const hasActiveFilter = filterStatus || filterReason || filterDateFrom || filterDateTo

  const resetFilters = () => {
    setFilterStatus('')
    setFilterReason('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  // ─── Handlers mutations ──────────────────────────────────────────────────────

  const handleClaim = (id: number) => {
    claimMutation.mutate(id, {
      onError: (err) => toast.error(err.message),
    })
  }

  const handleResolve = (id: number) => {
    setResolveNote('')
    setResolveTarget({ id })
  }

  const handleReject = (id: number) => {
    setRejectNote('')
    setRejectTarget({ id })
  }

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Aucun signalement pour le moment.
      </p>
    )
  }

  return (
    <>
      {/* Filtres (Story 4.5) */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ReportStatus | '')}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="IN_PROGRESS">En cours</option>
          <option value="RESOLVED">Résolu</option>
          <option value="REJECTED">Rejeté</option>
        </select>

        <select
          value={filterReason}
          onChange={(e) => setFilterReason(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
          disabled={uniqueReasons.length === 0}
        >
          <option value="">Toutes les raisons</option>
          {uniqueReasons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Depuis</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="border rounded-md px-2 py-2 text-sm bg-background"
          />
        </div>

        <div className="flex items-center gap-1">
          <label className="text-xs text-muted-foreground whitespace-nowrap">Jusqu&apos;à</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="border rounded-md px-2 py-2 text-sm bg-background"
          />
        </div>

        {hasActiveFilter && (
          <button
            onClick={resetFilters}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {hasActiveFilter && (
        <p className="text-xs text-muted-foreground mb-2">
          {filteredReports.length} résultat{filteredReports.length !== 1 ? 's' : ''} sur {reports.length}
        </p>
      )}

      {/* Tableau (Stories 4.3) */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">Post signalé</TableHead>
            <TableHead>Signalé par</TableHead>
            <TableHead>Raison</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Pris en charge par</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredReports.map((report) => (
            <TableRow
              key={report.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedReportId(report.id)}
            >
              <TableCell>
                {report.postExcerpt ? (
                  <div>
                    <p className="text-sm truncate max-w-[180px]">{report.postExcerpt}</p>
                    {report.postAuthorUsername && (
                      <p className="text-xs text-muted-foreground">par {report.postAuthorUsername}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground italic">(post supprimé)</span>
                )}
              </TableCell>

              <TableCell className="text-sm">{report.reportedByUsername}</TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {report.reason ?? '—'}
              </TableCell>

              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(report.createdAt).toLocaleDateString('fr-FR')}
              </TableCell>

              <TableCell>
                <StatusBadge status={report.status} />
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {report.claimedByUsername ?? '—'}
              </TableCell>

              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <ActionCell
                  report={report}
                  currentUsername={currentUsername}
                  onClaim={handleClaim}
                  onResolve={handleResolve}
                  onReject={handleReject}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Sheet détail (Story 4.5) */}
      <Sheet
        open={selectedReportId !== null}
        onOpenChange={(open) => { if (!open) setSelectedReportId(null) }}
      >
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Détail du report #{selectedReport?.id}</SheetTitle>
          </SheetHeader>

          {selectedReport && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedReport.status} />
                {selectedReport.claimedByUsername && (
                  <span className="text-xs text-muted-foreground">
                    pris en charge par <strong>{selectedReport.claimedByUsername}</strong>
                  </span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Contenu du post</p>
                {selectedReport.postContent ? (
                  <div className="rounded-md border p-3 text-sm bg-muted/30 whitespace-pre-wrap">
                    {selectedReport.postContent}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Post supprimé</p>
                )}
              </div>

              {selectedReport.postAuthorId && (
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Auteur : </span>
                    <a
                      href={`/utilisateurs?search=${selectedReport.postAuthorUsername ?? ''}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {selectedReport.postAuthorUsername}
                    </a>
                  </p>
                  {selectedReport.postTechGroupName && (
                    <p>
                      <span className="text-muted-foreground">Groupe : </span>
                      <span className="font-medium">{selectedReport.postTechGroupName}</span>
                    </p>
                  )}
                  <div className="flex gap-4 text-muted-foreground">
                    <span>{selectedReport.postLikesCount ?? 0} like{selectedReport.postLikesCount !== 1 ? 's' : ''}</span>
                    <span>{selectedReport.postCommentsCount ?? 0} commentaire{selectedReport.postCommentsCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              )}

              <div className="border-t pt-3 space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">Signalé par : </span>
                  <strong>{selectedReport.reportedByUsername}</strong>
                </p>
                <p>
                  <span className="text-muted-foreground">Raison : </span>
                  {selectedReport.reason ?? '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Le : </span>
                  {new Date(selectedReport.createdAt).toLocaleDateString('fr-FR')}
                </p>
              </div>

              {selectedReport.resolutionNote && (
                <div className="border-t pt-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Note de résolution</p>
                  <p className="text-sm border-l-2 pl-2 text-muted-foreground">
                    {selectedReport.resolutionNote}
                  </p>
                  {selectedReport.resolvedByUsername && (
                    <p className="text-xs text-muted-foreground mt-1">
                      par <strong>{selectedReport.resolvedByUsername}</strong>
                      {selectedReport.resolvedAt && (
                        <> le {new Date(selectedReport.resolvedAt).toLocaleDateString('fr-FR')}</>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* AlertDialog résolution (Story 4.4) */}
      <AlertDialog
        open={resolveTarget !== null}
        onOpenChange={(open) => { if (!open) setResolveTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Résoudre ce report ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le post signalé sera <strong>définitivement supprimé</strong>. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <label className="text-sm font-medium">Note de résolution (optionnelle)</label>
            <Textarea
              className="mt-1"
              placeholder="Ex. : contenu supprimé car contraire aux règles..."
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setResolveTarget(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!resolveTarget) return
                resolveMutation.mutate(
                  { id: resolveTarget.id, resolutionNote: resolveNote || undefined },
                  {
                    onSuccess: () => {
                      setResolveTarget(null)
                      toast.success('Report résolu — post supprimé')
                    },
                    onError: (err) => {
                      setResolveTarget(null)
                      toast.error(err.message)
                    },
                  }
                )
              }}
            >
              Confirmer la résolution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog rejet (Story 4.4) */}
      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => { if (!open) setRejectTarget(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter ce report ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le post sera <strong>conservé</strong>. Une note explicative est obligatoire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <label className="text-sm font-medium">
              Note de rejet <span className="text-destructive">*</span>
            </label>
            <Textarea
              className="mt-1"
              placeholder="Ex. : contenu conforme aux règles — report non justifié..."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
            />
            {rejectNote.trim() === '' && (
              <p className="text-xs text-destructive mt-1">La note est obligatoire pour rejeter un report.</p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setRejectTarget(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={rejectNote.trim() === ''}
              onClick={() => {
                if (!rejectTarget || !rejectNote.trim()) return
                rejectMutation.mutate(
                  { id: rejectTarget.id, resolutionNote: rejectNote.trim() },
                  {
                    onSuccess: () => {
                      setRejectTarget(null)
                      toast.success('Report rejeté — post conservé')
                    },
                    onError: (err) => {
                      setRejectTarget(null)
                      toast.error(err.message)
                    },
                  }
                )
              }}
            >
              Confirmer le rejet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
