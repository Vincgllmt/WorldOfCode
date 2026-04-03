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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

// ─── STATUS_CONFIG ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SuggestionStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'En attente',
    className: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  IN_PROGRESS: {
    label: 'En cours',
    className: 'bg-blue-100 text-blue-700 border-blue-300',
  },
  APPROVED: {
    label: 'Approuvée',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  },
  REJECTED: {
    label: 'Rejetée',
    className: 'bg-gray-100 text-gray-600 border-gray-300',
  },
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ suggestion }: { suggestion: GroupSuggestion }) {
  const config = STATUS_CONFIG[suggestion.status]

  if (suggestion.status === 'REJECTED' && suggestion.resolutionNote) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className={`cursor-help ${config.className}`}>
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{suggestion.resolutionNote}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Badge variant="outline" className={config.className}>
      {config.label}
    </Badge>
  )
}

// ─── ActionCell ───────────────────────────────────────────────────────────────

interface ActionCellProps {
  suggestion: GroupSuggestion
  currentAdminId: number
  onClaim: (id: number) => void
  onApproveClick: (suggestion: GroupSuggestion) => void
  onRejectClick: (suggestion: GroupSuggestion) => void
  isClaiming: boolean
  isApproving: boolean
  isRejecting: boolean
}

function ActionCell({
  suggestion,
  currentAdminId,
  onClaim,
  onApproveClick,
  onRejectClick,
  isClaiming,
  isApproving,
  isRejecting,
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
    const isMine = claimedBy?.id === currentAdminId

    if (isMine) {
      return (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => onApproveClick(suggestion)}
            disabled={isApproving}
          >
            {isApproving ? 'Approbation…' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRejectClick(suggestion)}
            disabled={isRejecting}
          >
            {isRejecting ? 'Rejet…' : 'Reject'}
          </Button>
        </div>
      )
    }

    return (
      <span className="text-sm text-muted-foreground italic">
        Handled by {claimedBy?.username ?? '—'}
      </span>
    )
  }

  return <span className="text-muted-foreground">—</span>
}

// ─── AdminGroupSuggestionPanel ────────────────────────────────────────────────

export default function AdminGroupSuggestionPanel() {
  const { suggestions, isLoading, error } = useGroupSuggestions()
  const { user: currentAdmin } = useAdminAuth()

  const claimMutation   = useClaimSuggestion()
  const approveMutation = useApproveSuggestion()
  const rejectMutation  = useRejectSuggestion()

  const [approveTarget, setApproveTarget]     = useState<GroupSuggestion | null>(null)
  const [approveName, setApproveName]         = useState('')
  const [approveDesc, setApproveDesc]         = useState('')
  const [approveRss, setApproveRss]           = useState('')
  const [rejectTarget, setRejectTarget]       = useState<GroupSuggestion | null>(null)
  const [rejectNote, setRejectNote]           = useState('')
  const [rejectNoteError, setRejectNoteError] = useState('')

  const openApproveDialog = (suggestion: GroupSuggestion) => {
    setApproveName(suggestion.name)
    setApproveDesc(suggestion.description ?? '')
    setApproveRss(suggestion.rssFeedUrl ?? '')
    setApproveTarget(suggestion)
  }

  const handleApproveConfirm = () => {
    if (!approveTarget) return
    approveMutation.mutate(
      { id: approveTarget.id, payload: { name: approveName, description: approveDesc, rssFeedUrl: approveRss } },
      { onSettled: () => setApproveTarget(null) }
    )
  }

  const handleRejectConfirm = () => {
    if (!rejectTarget) return
    const note = rejectNote.trim()
    if (!note) {
      setRejectNoteError('La note de résolution est obligatoire.')
      return
    }
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

  const openRejectDialog = (suggestion: GroupSuggestion) => {
    setRejectNote('')
    setRejectNoteError('')
    setRejectTarget(suggestion)
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  if (isLoading) {
    return <p className="text-muted-foreground py-8 text-center">Chargement des suggestions…</p>
  }

  if (error) {
    return <p className="text-red-500 py-8 text-center">Erreur lors du chargement des suggestions.</p>
  }

  return (
    <div className="space-y-4">
      {suggestions.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">
          Aucune suggestion de groupe pour le moment.
        </p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Suggéré par</TableHead>
                <TableHead>Nom du groupe</TableHead>
                <TableHead className="hidden md:table-cell">Description</TableHead>
                <TableHead className="hidden lg:table-cell">URL RSS</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Pris en charge par</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suggestions.map((suggestion) => (
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog — Approbation */}
      <AlertDialog
        open={approveTarget !== null}
        onOpenChange={(open) => { if (!open) setApproveTarget(null) }}
      >
        <AlertDialogContent className="sm:max-w-[520px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Approuver cette suggestion ?</AlertDialogTitle>
          </AlertDialogHeader>

          {approveTarget && (
            <div className="space-y-3 py-1">
              {/* Meta */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Soumis par <strong className="text-foreground">{approveTarget.suggestedBy.username}</strong></span>
                <span>{formatDate(approveTarget.createdAt)}</span>
              </div>

              {/* Nom */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Nom du groupe <span className="text-destructive">*</span>
                </label>
                <Input
                  value={approveName}
                  onChange={(e) => setApproveName(e.target.value)}
                  placeholder="Nom du groupe"
                  className="h-9 text-sm"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Description
                </label>
                <Textarea
                  value={approveDesc}
                  onChange={(e) => setApproveDesc(e.target.value)}
                  placeholder="Description du groupe (optionnelle)"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* RSS */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  URL RSS <span className="text-muted-foreground font-normal normal-case">(optionnel)</span>
                </label>
                <Input
                  value={approveRss}
                  onChange={(e) => setApproveRss(e.target.value)}
                  placeholder="https://example.com/feed.xml"
                  className="h-9 text-sm"
                  type="url"
                />
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Création…' : 'Créer le groupe'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog — Rejet */}
      <AlertDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null)
            setRejectNote('')
            setRejectNoteError('')
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-[520px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Rejeter cette suggestion ?</AlertDialogTitle>
          </AlertDialogHeader>

          {rejectTarget && (
            <div className="space-y-3 py-1">
              {/* Résumé suggestion */}
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Suggestion</p>
                <p className="font-semibold text-sm">{rejectTarget.name}</p>
                {rejectTarget.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{rejectTarget.description}</p>
                )}
              </div>

              {/* Note de rejet */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium">
                  Note de rejet <span className="text-destructive">*</span>
                </p>
                <Textarea
                  placeholder="ex: Un groupe similaire existe déjà sous le nom 'DevOps France'."
                  value={rejectNote}
                  onChange={(e) => {
                    setRejectNote(e.target.value)
                    if (e.target.value.trim()) setRejectNoteError('')
                  }}
                  rows={3}
                  className={rejectNoteError ? 'border-destructive' : ''}
                />
                {rejectNoteError && (
                  <p className="text-xs text-destructive">{rejectNoteError}</p>
                )}
              </div>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              className="bg-destructive hover:bg-destructive/90"
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? 'Rejet…' : 'Rejeter'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
