'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { Search, X, FileText, Image, Share2, Flag, MessageSquare } from 'lucide-react'

import { useAdminPosts, useAdminDeletePost } from '@/hooks/useAdminPosts'
import { useAdminPostDetail } from '@/hooks/useAdminPostDetail'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
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
import { PaginatedTable } from '../shared/PaginationTable'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'likesCount' | 'commentsCount' | 'reportsCount' | 'createdAt' | 'authorUsername' | 'techGroupName' | null

const ITEMS_PER_PAGE = 20

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PostPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-28" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/40 border-b border-border px-4 py-3 flex gap-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-16" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 last:border-0 px-4 py-3.5 flex items-center gap-8">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-8 ml-auto" />
            <Skeleton className="h-3.5 w-8" />
            <Skeleton className="h-3.5 w-8" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminPostPanel() {
  const [search, setSearch] = useState('')
  const [minReports, setMinReports] = useState<number>(0)
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const { posts, total, isLoading, isFetching } = useAdminPosts({
    page,
    limit: ITEMS_PER_PAGE,
    search:     search || undefined,
    minReports: minReports > 0 ? minReports : undefined,
    sortField:  sortKey ?? undefined,
    sortDir:    sortKey ? sortDir : undefined,
  })

  const deletePost = useAdminDeletePost()

  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const { postDetail, isLoading: isLoadingDetail } = useAdminPostDetail(selectedPostId)

  const [postToDelete, setPostToDelete] = useState<{
    id: number
    excerpt: string | null
  } | null>(null)

  const hasFilters = search || minReports > 0

  const handleFilterChange = (fn: () => void) => { fn(); setPage(1) }

  const resetFilters = () => {
    setSearch('')
    setMinReports(0)
    setPage(1)
  }

  const toggleSort = (key: SortKey) => {
    setPage(1)
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey !== key ? null : (
      <span className="ml-1 text-primary">{sortDir === 'asc' ? '↑' : '↓'}</span>
    )

  if (isLoading) return <PostPanelSkeleton />

  return (
    <>
      <div className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par contenu ou auteur..."
              value={search}
              onChange={(e) => handleFilterChange(() => setSearch(e.target.value))}
              className="pl-8 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Reports min.</label>
            <Input
              type="number"
              min={0}
              value={minReports}
              onChange={(e) => handleFilterChange(() => setMinReports(Math.max(0, parseInt(e.target.value) || 0)))}
              className="w-20 h-9 text-center text-sm"
            />
          </div>

          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1.5" />
              Réinitialiser
            </Button>
          )}

          <span className={`ml-auto text-xs font-mono transition-opacity ${isFetching ? 'opacity-50' : 'text-muted-foreground'}`}>
            {total} résultat{total !== 1 ? 's' : ''}
          </span>
        </div>

        <PaginatedTable
          data={posts}
          itemsPerPage={ITEMS_PER_PAGE}
          totalItems={total}
          currentPage={page}
          onPageChange={setPage}
          emptyState={
            <div className="flex flex-col items-center gap-2 py-2">
              <FileText className="h-8 w-8 text-muted-foreground/30" />
              <p>{hasFilters ? 'Aucun résultat pour ces filtres.' : 'Aucun post pour le moment.'}</p>
            </div>
          }
          headers={
            <>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => toggleSort('authorUsername')}
              >
                Auteur{sortIndicator('authorUsername')}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Extrait</TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => toggleSort('techGroupName')}
              >
                Groupe{sortIndicator('techGroupName')}
              </TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none text-right hover:text-foreground transition-colors"
                onClick={() => toggleSort('likesCount')}
              >
                Likes{sortIndicator('likesCount')}
              </TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none text-right hover:text-foreground transition-colors"
                onClick={() => toggleSort('commentsCount')}
              >
                Commentaires{sortIndicator('commentsCount')}
              </TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none text-right hover:text-foreground transition-colors"
                onClick={() => toggleSort('reportsCount')}
              >
                Reports{sortIndicator('reportsCount')}
              </TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => toggleSort('createdAt')}
              >
                Date{sortIndicator('createdAt')}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right">Actions</TableHead>
            </>
          }
          renderRow={(post) => (
            <TableRow
              key={post.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors border-border/50"
              onClick={() => setSelectedPostId(post.id)}
            >
              <TableCell className="font-medium text-sm">{post.authorUsername}</TableCell>
              <TableCell className="max-w-[200px]">
                <p className="text-sm truncate text-muted-foreground">{post.excerpt ?? '(sans contenu)'}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {post.techGroupName ?? '—'}
              </TableCell>
              <TableCell className="text-right text-sm font-mono">{post.likesCount}</TableCell>
              <TableCell className="text-right text-sm font-mono">{post.commentsCount}</TableCell>
              <TableCell className="text-right text-sm font-mono">
                {post.reportsCount > 0 ? (
                  <span className="font-medium text-orange-500">{post.reportsCount}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(post.createdAt).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setPostToDelete({ id: post.id, excerpt: post.excerpt })}
                >
                  Supprimer
                </Button>
              </TableCell>
            </TableRow>
          )}
        />
      </div>

      {/* Sheet détail post */}
      <Sheet open={!!selectedPostId} onOpenChange={(open) => { if (!open) setSelectedPostId(null) }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto border-border px-6">
          <SheetHeader className="border-b border-border pb-4 -mx-6 px-6">
            <SheetTitle className="text-base font-bold">
              Détail du post{' '}
              <span className="text-muted-foreground font-mono text-sm">#{selectedPostId}</span>
            </SheetTitle>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="space-y-4 mt-5 pb-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : postDetail ? (
            <div className="mt-5 space-y-5 pb-6">

              {/* Auteur */}
              <div className="flex items-center gap-3">
                {postDetail.authorAvatarUrl ? (
                  <img
                    src={postDetail.authorAvatarUrl}
                    alt={postDetail.authorUsername}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border shrink-0">
                    <span className="text-sm font-bold text-primary">
                      {postDetail.authorUsername[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">{postDetail.authorUsername}</p>
                  <p className="text-xs text-muted-foreground">{postDetail.authorEmail}</p>
                  {postDetail.techGroupName && (
                    <p className="text-xs text-muted-foreground">#{postDetail.techGroupName}</p>
                  )}
                </div>
                <span className="ml-auto text-xs text-muted-foreground font-mono">
                  {new Date(postDetail.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>

              {/* Contenu */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Contenu</p>
                {postDetail.content ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {postDetail.content}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">(aucun contenu texte)</p>
                )}
              </div>

              {/* Image */}
              {postDetail.imageUrl && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    Image
                  </p>
                  <img
                    src={postDetail.imageUrl}
                    alt="Post image"
                    className="rounded-lg border border-border max-h-48 object-cover w-full"
                  />
                </div>
              )}

              {/* Post partagé */}
              {postDetail.sharedFromId && (
                <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                    <Share2 className="h-3 w-3" />
                    Partage de
                  </p>
                  <p className="text-xs text-muted-foreground italic">
                    {postDetail.sharedFromExcerpt ?? '(contenu supprimé)'}
                  </p>
                  {postDetail.sharedFromAuthorUsername && (
                    <p className="text-xs text-muted-foreground mt-1">
                      par <strong className="text-foreground">{postDetail.sharedFromAuthorUsername}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono border-t border-border pt-4">
                <span>{postDetail.likesCount} like{postDetail.likesCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{postDetail.commentsCount} commentaire{postDetail.commentsCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span className={postDetail.reportsCount > 0 ? 'text-orange-500 font-semibold' : ''}>
                  {postDetail.reportsCount} report{postDetail.reportsCount !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Derniers commentaires */}
              {postDetail.lastComments.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Derniers commentaires
                  </p>
                  <div className="space-y-1.5">
                    {postDetail.lastComments.map((c) => (
                      <div key={c.id} className="text-xs rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <p className="font-medium text-foreground">{c.authorUsername}</p>
                        <p className="text-muted-foreground mt-0.5 truncate">{c.content}</p>
                        <p className="text-muted-foreground/60 mt-1 font-mono text-[11px]">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reports */}
              {postDetail.reports.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Flag className="h-3 w-3" />
                    Signalements ({postDetail.reports.length})
                  </p>
                  <div className="space-y-1.5">
                    {postDetail.reports.map((r) => (
                      <div key={r.id} className="text-xs rounded-lg border border-border/60 bg-muted/20 px-3 py-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{r.reportedByUsername}</p>
                          <p className="text-muted-foreground mt-0.5">{r.reason ?? '—'}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={
                            r.status === 'PENDING'     ? 'border-orange-400 text-orange-600 bg-orange-50 shrink-0' :
                            r.status === 'IN_PROGRESS' ? 'border-blue-400 text-blue-600 bg-blue-50 shrink-0' :
                            r.status === 'RESOLVED'    ? 'border-green-400 text-green-600 bg-green-50 shrink-0' :
                                                         'border-gray-400 text-gray-500 bg-gray-50 shrink-0'
                          }
                        >
                          {r.status === 'PENDING' ? 'En attente' :
                           r.status === 'IN_PROGRESS' ? 'En cours' :
                           r.status === 'RESOLVED' ? 'Résolu' : 'Rejeté'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* AlertDialog suppression */}
      <AlertDialog
        open={postToDelete !== null}
        onOpenChange={(open) => { if (!open) setPostToDelete(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce post ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                {postToDelete?.excerpt && (
                  <span className="block italic text-muted-foreground mb-2">
                    &ldquo;{postToDelete.excerpt}&rdquo;
                  </span>
                )}
                <span>
                  Cette action est <strong>irréversible</strong>. Le post et ses commentaires seront définitivement supprimés.
                </span>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPostToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!postToDelete) return
                deletePost.mutate(postToDelete.id, {
                  onSuccess: () => {
                    setPostToDelete(null)
                    toast.success('Post supprimé')
                  },
                  onError: () => {
                    setPostToDelete(null)
                    toast.error('Erreur lors de la suppression')
                  },
                })
              }}
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
