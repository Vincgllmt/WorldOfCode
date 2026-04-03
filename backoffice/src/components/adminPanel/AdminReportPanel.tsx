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
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={filterStatus || 'ALL'} onValueChange={(val) => setFilterStatus(val === 'ALL' ? '' : val as ReportStatus)}>
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
            <SelectItem value="RESOLVED">Résolu</SelectItem>
            <SelectItem value="REJECTED">Rejeté</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filterReason || 'ALL'}
          onValueChange={(val) => setFilterReason(val === 'ALL' ? '' : val)}
          disabled={uniqueReasons.length === 0}
        >
          <SelectTrigger className="h-9 w-[180px] text-sm">
            <SelectValue placeholder="Toutes les raisons" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes les raisons</SelectItem>
            {uniqueReasons.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Depuis</span>
          <Input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="h-9 w-[140px] text-sm"
          />
          <span>jusqu&apos;au</span>
          <Input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="h-9 w-[140px] text-sm"
          />
        </div>

        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            Effacer
          </Button>
        )}

        {hasActiveFilter && (
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            {filteredReports.length} résultat{filteredReports.length !== 1 ? 's' : ''} sur {reports.length}
          </span>
        )}
      </div>

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
      <Dialog
        open={selectedReportId !== null}
        onOpenChange={(open) => { if (!open) setSelectedReportId(null) }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-base font-bold">
              Report <span className="text-muted-foreground font-mono">#{selectedReport?.id}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-5">

              {/* Statut */}
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedReport.status} />
                {selectedReport.claimedByUsername && (
                  <span className="text-xs text-muted-foreground">
                    pris en charge par <strong className="text-foreground">{selectedReport.claimedByUsername}</strong>
                  </span>
                )}
              </div>

              {/* Contenu du post */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Contenu du post
                </p>
                {selectedReport.postContent ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedReport.postContent}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Post supprimé</p>
                )}
              </div>

              {/* Infos post */}
              {selectedReport.postAuthorId && (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Auteur</span>
                    <a
                      href={`/utilisateurs?search=${selectedReport.postAuthorUsername ?? ''}`}
                      className="text-primary hover:underline font-medium text-xs"
                    >
                      {selectedReport.postAuthorUsername}
                    </a>
                  </div>
                  {selectedReport.postTechGroupName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Groupe</span>
                      <span className="font-medium text-xs">{selectedReport.postTechGroupName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Engagement</span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {selectedReport.postLikesCount ?? 0} like{selectedReport.postLikesCount !== 1 ? 's' : ''}
                      {' · '}
                      {selectedReport.postCommentsCount ?? 0} commentaire{selectedReport.postCommentsCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              )}

              {/* Signalement */}
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Signalement
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Signalé par</span>
                  <strong>{selectedReport.reportedByUsername}</strong>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Raison</span>
                  <span className="font-medium">{selectedReport.reason ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-mono text-xs">{new Date(selectedReport.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Note de résolution */}
              {selectedReport.resolutionNote && (
                <div className="border-t border-border pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Note de résolution
                  </p>
                  <p className="text-sm border-l-2 border-primary/40 pl-3 py-0.5 text-muted-foreground bg-muted/30 rounded-r-md">
                    {selectedReport.resolutionNote}
                  </p>
                  {selectedReport.resolvedByUsername && (
                    <p className="text-xs text-muted-foreground mt-2">
                      par <strong className="text-foreground">{selectedReport.resolvedByUsername}</strong>
                      {selectedReport.resolvedAt && (
                        <> · {new Date(selectedReport.resolvedAt).toLocaleDateString('fr-FR')}</>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
