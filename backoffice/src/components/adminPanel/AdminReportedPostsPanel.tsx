'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

import {
  useAdminReportedPosts,
  useAdminReports,
  useClaimReport,
  useResolveReport,
  useRejectReport,
} from '@/hooks/useAdminReports'
import { AdminReportedPost } from '@/interfaces/adminReportedPost'
import { AdminReport, ReportStatus } from '@/interfaces/adminReport'

import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUp, ArrowDown, FileText, CheckCircle2, XCircle, ClipboardList } from 'lucide-react'
import { PaginatedTable } from '@/components/shared/PaginationTable'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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

const STATUS_CONFIG: Record<ReportStatus, { label: string; className: string }> = {
  PENDING:     { label: 'En attente', className: 'border-orange-400 text-orange-600 bg-orange-50' },
  IN_PROGRESS: { label: 'En cours',   className: 'border-blue-400 text-blue-600 bg-blue-50' },
  RESOLVED:    { label: 'Résolu',     className: 'border-green-400 text-green-600 bg-green-50' },
  REJECTED:    { label: 'Rejeté',     className: 'border-gray-400 text-gray-500 bg-gray-50' },
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return <Badge variant="outline" className={`text-[10px] py-0 ${className}`}>{label}</Badge>
}

type SortKey = 'latestReportAt' | 'reportCount' | 'pendingCount'

const ITEMS_PER_PAGE = 20

// Sub-panel: shows all reports for a specific post
function PostReportsSheet({
  reportedPost,
  onClose,
}: {
  reportedPost: AdminReportedPost
  onClose: () => void
}) {
  const [page, setPage] = useState(1)
  const { reports, total, isLoading } = useAdminReports({
    page, limit: 10, postId: reportedPost.postId,
  })
  const claimMutation   = useClaimReport()
  const resolveMutation = useResolveReport()
  const rejectMutation  = useRejectReport()

  const [resolveTarget, setResolveTarget] = useState<{ id: number } | null>(null)
  const [resolveNote, setResolveNote]     = useState('')
  const [rejectTarget, setRejectTarget]   = useState<{ id: number } | null>(null)
  const [rejectNote, setRejectNote]       = useState('')

  return (
    <>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Signalements du post
          </SheetTitle>
          <div className="mt-2">
            {reportedPost.postContent ? (
              <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 text-sm leading-relaxed line-clamp-3">
                {reportedPost.postContent}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">Post supprimé</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              {reportedPost.postAuthorUsername && (
                <span>par <strong className="text-foreground">{reportedPost.postAuthorUsername}</strong></span>
              )}
              {reportedPost.postTechGroupName && (
                <span>· {reportedPost.postTechGroupName}</span>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="px-6 py-4 flex-1 space-y-3">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            {total} signalement{total !== 1 ? 's' : ''}
          </p>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border px-4 py-3 space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClaim={() => claimMutation.mutate(report.id, {
                    onSuccess: () => toast.success('Report pris en charge'),
                    onError: (err) => toast.error(err.message),
                  })}
                  onResolve={() => { setResolveNote(''); setResolveTarget({ id: report.id }) }}
                  onReject={() => { setRejectNote(''); setRejectTarget({ id: report.id }) }}
                />
              ))}
              {total > 10 && (
                <div className="flex justify-center gap-2 pt-2">
                  <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
                    Précédent
                  </Button>
                  <span className="text-xs text-muted-foreground self-center">
                    {page} / {Math.ceil(total / 10)}
                  </span>
                  <Button size="sm" variant="outline" disabled={page * 10 >= total} onClick={() => setPage(p => p + 1)}>
                    Suivant
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </SheetContent>

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
                    onSuccess: () => { setResolveTarget(null); onClose(); toast.success('Report résolu — post supprimé') },
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
    </>
  )
}

function ReportCard({
  report,
  onClaim,
  onResolve,
  onReject,
}: {
  report: AdminReport
  onClaim: () => void
  onResolve: () => void
  onReject: () => void
}) {
  return (
    <div className="rounded-lg border border-border px-4 py-3 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <StatusBadge status={report.status} />
            <span className="text-xs text-muted-foreground font-mono">#{report.id}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Signalé par <strong className="text-foreground">{report.reportedByUsername}</strong>
            {' · '}
            {new Date(report.createdAt).toLocaleDateString('fr-FR')}
          </p>
          {report.reason && (
            <p className="text-xs text-muted-foreground">Raison : {report.reason}</p>
          )}
          {report.claimedByUsername && (
            <p className="text-xs text-muted-foreground">
              Pris en charge par <strong className="text-foreground">{report.claimedByUsername}</strong>
            </p>
          )}
          {report.resolutionNote && (
            <p className="text-xs text-muted-foreground italic">Note : {report.resolutionNote}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {report.status === 'PENDING' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onClaim}>
              Prendre en charge
            </Button>
          )}
          {report.status === 'IN_PROGRESS' && (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1"
                onClick={onResolve}
              >
                <CheckCircle2 className="h-3 w-3" />
                Résoudre
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1 text-destructive border-destructive hover:bg-destructive/10"
                onClick={onReject}
              >
                <XCircle className="h-3 w-3" />
                Rejeter
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminReportedPostsPanel() {
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('latestReportAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedPost, setSelectedPost] = useState<AdminReportedPost | null>(null)

  const { reportedPosts, total, isLoading, isFetching } = useAdminReportedPosts({
    page,
    limit: ITEMS_PER_PAGE,
    sortField: sortKey,
    sortDir,
  })

  const handleSort = (key: SortKey) => {
    setPage(1)
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
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
              <Skeleton className="h-3.5 w-52" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-3.5 w-20" />
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
          Posts signalés regroupés — cliquez pour voir le détail des signalements.
        </p>
        <span className={`text-xs text-muted-foreground font-mono transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
          {total} post{total !== 1 ? 's' : ''} signalé{total !== 1 ? 's' : ''}
        </span>
      </div>

      <PaginatedTable
        data={reportedPosts}
        totalItems={total}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-10">
            <FileText className="h-8 w-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aucun post signalé pour le moment.</p>
          </div>
        }
        headers={
          <>
            <TableHead className="text-xs font-semibold text-muted-foreground">Post signalé</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground">Groupe</TableHead>
            <TableHead
              className="text-xs font-semibold text-muted-foreground cursor-pointer select-none text-center"
              onClick={() => handleSort('reportCount')}
            >
              Total <SortIcon col="reportCount" />
            </TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground text-center">En attente</TableHead>
            <TableHead className="text-xs font-semibold text-muted-foreground text-center">En cours</TableHead>
            <TableHead
              className="text-xs font-semibold text-muted-foreground cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSort('latestReportAt')}
            >
              Dernier signalement <SortIcon col="latestReportAt" />
            </TableHead>
          </>
        }
        renderRow={(post) => (
          <TableRow
            key={post.postId}
            className="cursor-pointer hover:bg-muted/40 transition-colors border-border/50"
            onClick={() => setSelectedPost(post)}
          >
            <TableCell>
              {post.postContent ? (
                <div>
                  <p className="text-sm truncate max-w-[220px]">{post.postContent}</p>
                  {post.postAuthorUsername && (
                    <p className="text-xs text-muted-foreground">par {post.postAuthorUsername}</p>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground italic">(post supprimé)</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {post.postTechGroupName ?? '—'}
            </TableCell>
            <TableCell className="text-center">
              <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-muted text-xs font-bold px-1.5">
                {post.reportCount}
              </span>
            </TableCell>
            <TableCell className="text-center">
              {post.pendingCount > 0 ? (
                <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-orange-500/10 text-orange-600 text-xs font-bold px-1.5">
                  {post.pendingCount}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              {post.inProgressCount > 0 ? (
                <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-blue-500/10 text-blue-600 text-xs font-bold px-1.5">
                  {post.inProgressCount}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {new Date(post.latestReportAt).toLocaleDateString('fr-FR')}
            </TableCell>
          </TableRow>
        )}
      />

      <Sheet open={selectedPost !== null} onOpenChange={(open) => { if (!open) setSelectedPost(null) }}>
        {selectedPost && (
          <PostReportsSheet
            reportedPost={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </Sheet>
    </div>
  )
}
