'use client'

import { useState } from 'react'
import {
  useGroupSuggestions,
  useClaimSuggestion,
  useApproveSuggestion,
  useRejectSuggestion,
} from '@/hooks/useGroupSuggestions'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { GroupSuggestion, SuggestionStatus } from '@/interfaces/groupSuggestion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { PaginatedTable } from '@/components/shared/PaginationTable'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
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
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ArrowUp, ArrowDown, Lightbulb } from 'lucide-react'

// ─── STATUS_CONFIG ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; className: string }> = {
  PENDING:     { label: 'En attente', className: 'bg-orange-100 text-orange-700 border-orange-300' },
  IN_PROGRESS: { label: 'En cours',   className: 'bg-blue-100 text-blue-700 border-blue-300' },
  APPROVED:    { label: 'Approuvée',  className: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  REJECTED:    { label: 'Rejetée',    className: 'bg-gray-100 text-gray-600 border-gray-300' },
}

function StatusBadge({ suggestion }: { suggestion: GroupSuggestion }) {
  const config = STATUS_CONFIG[suggestion.status]
  if (suggestion.status === 'REJECTED' && suggestion.resolutionNote) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`cursor-help ${config.className}`}>{config.label}</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{suggestion.resolutionNote}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>
}

// ─── ActionCell ───────────────────────────────────────────────────────────────

interface ActionCellProps {
  suggestion: GroupSuggestion
  currentAdminId: number
  onClaim: (id: number) => void
  onApproveClick: (s: GroupSuggestion) => void
  onRejectClick: (s: GroupSuggestion) => void
  isClaiming: boolean
  isApproving: boolean
  isRejecting: boolean
}

function ActionCell({
  suggestion, currentAdminId, onClaim, onApproveClick, onRejectClick,
  isClaiming, isApproving, isRejecting,
}: ActionCellProps) {
  const { status, claimedBy } = suggestion

  if (status === 'PENDING') {
    return (
      <Button size="sm" variant="outline" onClick={() => onClaim(suggestion.id)} disabled={isClaiming}>
        {isClaiming ? 'En cours…' : 'Claim'}
      </Button>
    )
  }

  if (status === 'IN_PROGRESS') {
    if (claimedBy?.id === currentAdminId) {
      return (
        <div className="flex gap-2">
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onApproveClick(suggestion)} disabled={isApproving}>
            {isApproving ? 'Approbation…' : 'Approve'}
          </Button>
          <Button size="sm" variant="destructive" onClick={() => onRejectClick(suggestion)} disabled={isRejecting}>
            {isRejecting ? 'Rejet…' : 'Reject'}
          </Button>
        </div>
      )
    }
    return <span className="text-sm text-muted-foreground italic">Handled by {claimedBy?.username ?? '—'}</span>
  }

  return <span className="text-muted-foreground">—</span>
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'createdAt' | 'name' | 'status' | 'suggestedByUsername'

const ITEMS_PER_PAGE = 20

// ─── AdminGroupSuggestionPanel ────────────────────────────────────────────────

export default function AdminGroupSuggestionPanel() {
  const { user: currentAdmin } = useAdminAuth()

  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState('')

  const { suggestions, total, isLoading, isFetching } = useGroupSuggestions({
    page,
    limit: ITEMS_PER_PAGE,
    status:    filterStatus || undefined,
    sortField: sortKey,
    sortDir,
  })

  const claimMutation   = useClaimSuggestion()
  const approveMutation = useApproveSuggestion()
  const rejectMutation  = useRejectSuggestion()

  const [approveTarget, setApproveTarget] = useState<GroupSuggestion | null>(null)
  const [approveName, setApproveName]     = useState('')
  const [approveDesc, setApproveDesc]     = useState('')
  const [approveRss, setApproveRss]       = useState('')
  const [rejectTarget, setRejectTarget]   = useState<GroupSuggestion | null>(null)
  const [rejectNote, setRejectNote]       = useState('')
  const [rejectNoteError, setRejectNoteError] = useState('')

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

  const openApproveDialog = (s: GroupSuggestion) => {
    setApproveName(s.name)
    setApproveDesc(s.description ?? '')
    setApproveRss(s.rssFeedUrl ?? '')
    setApproveTarget(s)
  }

  const handleApproveConfirm = () => {
    if (!approveTarget) return
    approveMutation.mutate(
      { id: approveTarget.id, payload: { name: approveName, description: approveDesc, rssFeedUrl: approveRss } },
      { onSettled: () => setApproveTarget(null) }
    )
  }

  const openRejectDialog = (s: GroupSuggestion) => {
    setRejectNote('')
    setRejectNoteError('')
    setRejectTarget(s)
  }

  const handleRejectConfirm = () => {
    if (!rejectTarget) return
    const note = rejectNote.trim()
    if (!note) { setRejectNoteError('La note de résolution est obligatoire.'); return }
    rejectMutation.mutate(
      { id: rejectTarget.id, payload: { resolutionNote: note } },
      {
        onSettled: () => {
          setRejectTarget(null)
          setRejectNote('')
          setRejectNoteError('')
        },
      }
    )
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-[160px]" />
          <Skeleton className="h-9 w-20 ml-auto" />
        </div>
        <div className="rounded-lg border overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border-b last:border-0 px-4 py-3.5 flex gap-6">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-7 w-20 ml-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-2">
        <Select value={filterStatus || 'ALL'} onValueChange={(val) => { setFilterStatus(val === 'ALL' ? '' : val); setPage(1) }}>
          <SelectTrigger className="h-9 w-[160px] text-sm">
            <SelectValue placeholder="Tous les statuts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
            <SelectItem value="APPROVED">Approuvée</SelectItem>
            <SelectItem value="REJECTED">Rejetée</SelectItem>
          </SelectContent>
        </Select>

        <span className={`ml-auto text-xs text-muted-foreground font-mono transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
          {total} suggestion{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau */}
      <PaginatedTable
        data={suggestions}
        totalItems={total}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-8">
            <Lightbulb className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {filterStatus ? 'Aucune suggestion pour ce statut.' : 'Aucune suggestion de groupe pour le moment.'}
            </p>
          </div>
        }
        headers={
          <>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('suggestedByUsername')}
            >
              Suggéré par <SortIcon col="suggestedByUsername" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('name')}
            >
              Nom du groupe <SortIcon col="name" />
            </TableHead>
            <TableHead className="hidden md:table-cell">Description</TableHead>
            <TableHead className="hidden lg:table-cell">URL RSS</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('createdAt')}
            >
              Date <SortIcon col="createdAt" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('status')}
            >
              Statut <SortIcon col="status" />
            </TableHead>
            <TableHead>Pris en charge par</TableHead>
            <TableHead>Actions</TableHead>
          </>
        }
        renderRow={(suggestion) => (
          <TableRow key={suggestion.id}>
            <TableCell className="font-medium">{suggestion.suggestedBy.username}</TableCell>
            <TableCell>{suggestion.name}</TableCell>
            <TableCell className="hidden md:table-cell max-w-[200px]">
              <span className="line-clamp-2 text-sm text-muted-foreground">
                {suggestion.description ?? '—'}
              </span>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              {suggestion.rssFeedUrl ? (
                <a
                  href={suggestion.rssFeedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline truncate block max-w-[180px]"
                  title={suggestion.rssFeedUrl}
                >
                  {suggestion.rssFeedUrl}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
              {formatDate(suggestion.createdAt)}
            </TableCell>
            <TableCell>
              <StatusBadge suggestion={suggestion} />
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {suggestion.claimedBy?.username ?? '—'}
            </TableCell>
            <TableCell>
              {currentAdmin && (
                <ActionCell
                  suggestion={suggestion}
                  currentAdminId={currentAdmin.id}
                  onClaim={(id) => claimMutation.mutate(id)}
                  onApproveClick={openApproveDialog}
                  onRejectClick={openRejectDialog}
                  isClaiming={claimMutation.isPending}
                  isApproving={approveMutation.isPending}
                  isRejecting={rejectMutation.isPending}
                />
              )}
            </TableCell>
          </TableRow>
        )}
      />

      {/* Dialog — Approbation */}
      <AlertDialog open={approveTarget !== null} onOpenChange={(open) => { if (!open) setApproveTarget(null) }}>
        <AlertDialogContent className="sm:max-w-[520px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Approuver cette suggestion ?</AlertDialogTitle>
          </AlertDialogHeader>
          {approveTarget && (
            <div className="space-y-3 py-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Soumis par <strong className="text-foreground">{approveTarget.suggestedBy.username}</strong></span>
                <span>{formatDate(approveTarget.createdAt)}</span>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nom du groupe <span className="text-destructive">*</span>
                </label>
                <Input value={approveName} onChange={(e) => setApproveName(e.target.value)} placeholder="Nom du groupe" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <Textarea value={approveDesc} onChange={(e) => setApproveDesc(e.target.value)} placeholder="Description du groupe (optionnelle)" rows={3} className="text-sm resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  URL RSS <span className="text-muted-foreground font-normal normal-case">(optionnel)</span>
                </label>
                <Input value={approveRss} onChange={(e) => setApproveRss(e.target.value)} placeholder="https://example.com/feed.xml" className="h-9 text-sm" type="url" />
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleApproveConfirm} className="bg-emerald-600 hover:bg-emerald-700" disabled={approveMutation.isPending}>
              {approveMutation.isPending ? 'Création…' : 'Créer le groupe'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog — Rejet */}
      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectNote(''); setRejectNoteError('') } }}
      >
        <AlertDialogContent className="sm:max-w-[520px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter cette suggestion ?</AlertDialogTitle>
          </AlertDialogHeader>
          {rejectTarget && (
            <div className="space-y-3 py-1">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Suggestion</p>
                <p className="font-semibold text-sm">{rejectTarget.name}</p>
                {rejectTarget.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rejectTarget.description}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Note de rejet <span className="text-destructive">*</span></p>
                <Textarea
                  placeholder="ex: Un groupe similaire existe déjà sous le nom 'DevOps France'."
                  value={rejectNote}
                  onChange={(e) => { setRejectNote(e.target.value); if (e.target.value.trim()) setRejectNoteError('') }}
                  rows={3}
                  className={rejectNoteError ? 'border-destructive' : ''}
                />
                {rejectNoteError && <p className="text-xs text-destructive">{rejectNoteError}</p>}
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRejectConfirm} className="bg-destructive hover:bg-destructive/90" disabled={rejectMutation.isPending}>
              {rejectMutation.isPending ? 'Rejet…' : 'Rejeter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
