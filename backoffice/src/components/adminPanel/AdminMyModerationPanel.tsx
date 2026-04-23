'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

import { useAdminReports, useResolveReport, useRejectReport } from '@/hooks/useAdminReports'
import { AdminReport, ReportStatus } from '@/interfaces/adminReport'

import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUp, ArrowDown, CheckCircle2, XCircle, Inbox } from 'lucide-react'
import { PaginatedTable } from '@/components/shared/PaginationTable'
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

type SortKey = 'createdAt' | 'claimedAt' | 'reportedByUsername'

const ITEMS_PER_PAGE = 20

export default function AdminMyModerationPanel() {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('claimedAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const { reports, total, isLoading, isFetching } = useAdminReports({
    page,
    limit: ITEMS_PER_PAGE,
    status: 'IN_PROGRESS',
    claimedByMe: true,
    sortField: sortKey,
    sortDir,
  })

  const resolveMutation = useResolveReport()
  const rejectMutation  = useRejectReport()

  const [selectedReport, setSelectedReport] = useState<AdminReport | null>(null)
  const [resolveTarget, setResolveTarget] = useState<{ id: number } | null>(null)
  const [resolveNote, setResolveNote]     = useState('')
  const [rejectTarget, setRejectTarget]   = useState<{ id: number } | null>(null)
  const [rejectNote, setRejectNote]       = useState('')

  const handleSort = (key: SortKey) => {
    setPage(1)
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc'
      ? <ArrowUp className="inline h-3 w-3 ml-1" />
      : <ArrowDown className="inline h-3 w-3 ml-1" />
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border-b last:border-0 px-4 py-3.5 flex items-center gap-6">
              <Skeleton className="h-3.5 w-40" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-24" />
              <div className="flex gap-2 ml-auto">
                <Skeleton className="h-7 w-22 rounded" />
                <Skeleton className="h-7 w-18 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Reports que vous avez pris en charge et en attente de décision.
        </p>
        <span className={`text-xs text-muted-foreground font-mono transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
          {total} en cours
        </span>
      </div>

      <PaginatedTable
        data={reports}
        totalItems={total}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-10">
            <CheckCircle2 className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Tout est à jour, aucun report en attente de votre part.</p>
          </div>
        }
        headers={
          <>
            <TableHead className="text-xs font-semibold text-muted-foreground">Post signalé</TableHead>
            <TableHead
              className="text-xs font-semibold text-muted-foreground cursor-pointer select-none"
              onClick={() => handleSort('reportedByUsername')}
            >
              Signalé par <SortIcon col="reportedByUsername" />
            </TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Raison</TableHead>
            <TableHead
              className="text-xs font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSort('createdAt')}
            >
              Signalé le <SortIcon col="createdAt" />
            </TableHead>
            <TableHead
              className="text-xs font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSort('claimedAt')}
            >
              Pris en charge le <SortIcon col="claimedAt" />
            </TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
          </>
        }
        renderRow={(report) => (
          <TableRow
            key={report.id}
            className="cursor-pointer hover:bg-muted/40 transition-colors border-border/50"
            onClick={() => setSelectedReport(report)}
          >
            <TableCell>
              {report.postExcerpt ? (
                <div>
                  <p className="text-sm truncate max-w-[200px]">{report.postExcerpt}</p>
                  {report.postAuthorUsername && (
                    <p className="text-xs text-muted-foreground">par {report.postAuthorUsername}</p>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">(post supprimé)</span>
              )}
            </TableCell>
            <TableCell className="text-sm">{report.reportedByUsername}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{report.reason ?? '—'}</TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {new Date(report.createdAt).toLocaleDateString('fr-FR')}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {report.claimedAt ? new Date(report.claimedAt).toLocaleDateString('fr-FR') : '—'}
            </TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5"
                  onClick={() => { setResolveNote(''); setResolveTarget({ id: report.id }) }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Résoudre
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => { setRejectNote(''); setRejectTarget({ id: report.id }) }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rejeter
                </Button>
              </div>
            </TableCell>
          </TableRow>
        )}
      />

      {/* Dialog détail */}
      <Dialog open={selectedReport !== null} onOpenChange={(open) => { if (!open) setSelectedReport(null) }}>
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="text-base font-bold">
              Report <span className="text-muted-foreground font-mono">#{selectedReport?.id}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-5 mt-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={selectedReport.status} />
                {selectedReport.claimedAt && (
                  <span className="text-xs text-muted-foreground">
                    pris en charge le{' '}
                    <strong className="text-foreground">
                      {new Date(selectedReport.claimedAt).toLocaleDateString('fr-FR')}
                    </strong>
                  </span>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Contenu du post</p>
                {selectedReport.postContent ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedReport.postContent}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Post supprimé</p>
                )}
              </div>
              {selectedReport.postAuthorId && (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">Auteur</span>
                    <span className="font-medium text-xs">{selectedReport.postAuthorUsername}</span>
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
                      {selectedReport.postLikesCount ?? 0} likes · {selectedReport.postCommentsCount ?? 0} commentaires
                    </span>
                  </div>
                </div>
              )}
              <div className="border-t border-border pt-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Signalement</p>
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
              <div className="border-t border-border pt-4 flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1.5"
                  onClick={() => { setSelectedReport(null); setResolveNote(''); setResolveTarget({ id: selectedReport.id }) }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Résoudre
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => { setSelectedReport(null); setRejectNote(''); setRejectTarget({ id: selectedReport.id }) }}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Rejeter
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* AlertDialog résolution */}
      <AlertDialog open={resolveTarget !== null} onOpenChange={(open) => { if (!open) setResolveTarget(null) }}>
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
                    onSuccess: () => { setResolveTarget(null); toast.success('Report résolu — post supprimé') },
                    onError: (err) => { setResolveTarget(null); toast.error(err.message) },
                  }
                )
              }}
            >
              Confirmer la résolution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog rejet */}
      <AlertDialog open={rejectTarget !== null} onOpenChange={(open) => { if (!open) setRejectTarget(null) }}>
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
                    onSuccess: () => { setRejectTarget(null); toast.success('Report rejeté — post conservé') },
                    onError: (err) => { setRejectTarget(null); toast.error(err.message) },
                  }
                )
              }}
            >
              Confirmer le rejet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
