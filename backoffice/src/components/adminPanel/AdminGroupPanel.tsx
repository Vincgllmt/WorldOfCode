'use client'

import { useState } from 'react'
import { useAdminGroups, useCreateAdminGroup, useUpdateAdminGroup, useDeleteAdminGroup } from '@/hooks/useAdminGroups'
import { useAdminGroupDetail } from '@/hooks/useAdminGroupDetail'
import { AdminGroupListItem } from '@/interfaces/adminGroup'
import { GroupFormDialog } from './GroupFormDialog'
import { PaginatedTable } from '@/components/shared/PaginationTable'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, Search, Rss, MoreVertical, ArrowUp, ArrowDown, Layers, Users, FileText } from 'lucide-react'

type SortKey = 'name' | 'memberCount' | 'postCount' | 'createdAt' | 'creatorUsername'

const ITEMS_PER_PAGE = 20

export default function AdminGroupPanel() {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const { groups, total, isLoading, isFetching } = useAdminGroups({
    page,
    limit: ITEMS_PER_PAGE,
    search:    search || undefined,
    sortField: sortKey,
    sortDir,
  })

  const createGroup = useCreateAdminGroup()
  const updateGroup = useUpdateAdminGroup()
  const deleteGroup = useDeleteAdminGroup()

  const [createOpen, setCreateOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<AdminGroupListItem | null>(null)
  const [groupToDelete, setGroupToDelete] = useState<{ id: number; name: string } | null>(null)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const { groupDetail, isLoading: isLoadingDetail } = useAdminGroupDetail(selectedGroupId)

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

  const filtered = groups

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-9 flex-1 max-w-sm" />
          <Skeleton className="h-9 w-36 ml-auto" />
        </div>
        <div className="rounded-lg border overflow-hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b last:border-0 px-4 py-3.5 flex gap-6">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3.5 w-6" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-12" />
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-7 w-7 rounded ml-auto" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="pl-8 h-9 text-sm"
          />
        </div>
        <span className={`text-xs text-muted-foreground transition-opacity ${isFetching ? 'opacity-50' : 'opacity-100'}`}>
          {total} groupe{total !== 1 ? 's' : ''}
        </span>
        <Button size="sm" className="ml-auto gap-1.5" onClick={() => setCreateOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nouveau groupe
        </Button>
      </div>

      <PaginatedTable
        data={filtered}
        totalItems={total}
        currentPage={page}
        onPageChange={setPage}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-8">
            <Layers className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun groupe trouvé</p>
          </div>
        }
        headers={
          <>
            <TableHead
              className="cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSort('name')}
            >
              Nom <SortIcon col="name" />
            </TableHead>
            <TableHead>Description</TableHead>
            <TableHead>RSS</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('memberCount')}
            >
              Membres <SortIcon col="memberCount" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('postCount')}
            >
              Posts <SortIcon col="postCount" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort('creatorUsername')}
            >
              Créateur <SortIcon col="creatorUsername" />
            </TableHead>
            <TableHead
              className="cursor-pointer select-none whitespace-nowrap"
              onClick={() => handleSort('createdAt')}
            >
              Créé le <SortIcon col="createdAt" />
            </TableHead>
            <TableHead className="w-10" />
          </>
        }
        renderRow={(group) => (
          <TableRow
            key={group.id}
            className="hover:bg-muted/30 cursor-pointer"
            onClick={() => setSelectedGroupId(group.id)}
          >
            <TableCell className="font-medium">{group.name}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
              {group.description
                ? group.description.length > 60
                  ? group.description.slice(0, 60) + '…'
                  : group.description
                : <span className="opacity-40">—</span>}
            </TableCell>
            <TableCell>
              {group.rssFeedUrl ? (
                <a
                  href={group.rssFeedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Rss className="h-3.5 w-3.5" />
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="font-mono text-sm">{group.memberCount}</TableCell>
            <TableCell className="font-mono text-sm">{group.postCount}</TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {group.creatorUsername ?? <span className="opacity-40">—</span>}
            </TableCell>
            <TableCell className="text-sm whitespace-nowrap">
              {new Date(group.createdAt).toLocaleDateString('fr-FR')}
            </TableCell>
            <TableCell onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingGroup(group)}>
                    Éditer
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setGroupToDelete({ id: group.id, name: group.name })}
                  >
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        )}
      />

      {/* Sheet détail groupe */}
      <Sheet open={!!selectedGroupId} onOpenChange={(open) => { if (!open) setSelectedGroupId(null) }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto border-border px-6">
          <SheetHeader className="border-b border-border pb-4 -mx-6 px-6">
            <SheetTitle className="text-base font-bold">
              Détail du groupe{' '}
              <span className="text-muted-foreground font-mono text-sm">#{selectedGroupId}</span>
            </SheetTitle>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="space-y-4 mt-5 pb-6">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          ) : groupDetail ? (
            <div className="mt-5 space-y-5 pb-6">

              {/* Nom + créateur */}
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center ring-2 ring-border shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {groupDetail.name[0]?.toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight">{groupDetail.name}</p>
                  {groupDetail.creatorUsername && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Créé par <strong className="text-foreground">{groupDetail.creatorUsername}</strong>
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground font-mono">
                    {new Date(groupDetail.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>

              {/* Description */}
              {groupDetail.description && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
                  <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed">
                    {groupDetail.description}
                  </div>
                </div>
              )}

              {/* RSS */}
              {groupDetail.rssFeedUrl && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Rss className="h-3 w-3" />
                    Flux RSS
                  </p>
                  <a
                    href={groupDetail.rssFeedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline break-all"
                  >
                    {groupDetail.rssFeedUrl}
                  </a>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono border-t border-border pt-4">
                <span>{groupDetail.memberCount} membre{groupDetail.memberCount !== 1 ? 's' : ''}</span>
                <span>·</span>
                <span>{groupDetail.postCount} post{groupDetail.postCount !== 1 ? 's' : ''}</span>
              </div>

              {/* Membres */}
              {groupDetail.members.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Membres ({groupDetail.memberCount > 20 ? `20 / ${groupDetail.memberCount}` : groupDetail.memberCount})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {groupDetail.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs"
                      >
                        {m.avatarUrl ? (
                          <img src={m.avatarUrl} alt={m.username} className="h-4 w-4 rounded-full object-cover" />
                        ) : (
                          <span className="h-4 w-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                            {m.username[0]?.toUpperCase()}
                          </span>
                        )}
                        {m.username}
                      </div>
                    ))}
                    {groupDetail.memberCount > 20 && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        +{groupDetail.memberCount - 20} autres
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Posts récents */}
              {groupDetail.recentPosts.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Posts récents
                  </p>
                  <div className="space-y-1.5">
                    {groupDetail.recentPosts.map((p) => (
                      <div key={p.id} className="text-xs rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="font-medium text-foreground">{p.authorUsername}</p>
                          <p className="text-muted-foreground/60 font-mono text-[11px] shrink-0">
                            {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        {p.excerpt ? (
                          <p className="text-muted-foreground leading-relaxed">{p.excerpt}</p>
                        ) : (
                          <p className="text-muted-foreground/50 italic">(pas de texte)</p>
                        )}
                        <p className="text-muted-foreground/60 font-mono mt-1">
                          {p.likesCount} like{p.likesCount !== 1 ? 's' : ''} · {p.commentsCount} commentaire{p.commentsCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Dialog création */}
      <GroupFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSubmit={async (values) => {
          await createGroup.mutateAsync({
            name: values.name,
            description: values.description,
            rssFeedUrl: values.rssFeedUrl || undefined,
          })
          setCreateOpen(false)
        }}
        isSubmitting={createGroup.isPending}
      />

      {/* Dialog édition */}
      <GroupFormDialog
        open={!!editingGroup}
        onOpenChange={(open) => { if (!open) setEditingGroup(null) }}
        mode="edit"
        initialValues={{
          name: editingGroup?.name ?? '',
          description: editingGroup?.description ?? '',
          rssFeedUrl: editingGroup?.rssFeedUrl ?? '',
        }}
        onSubmit={async (values) => {
          await updateGroup.mutateAsync({
            id: editingGroup!.id,
            name: values.name,
            description: values.description,
            rssFeedUrl: values.rssFeedUrl || undefined,
          })
          setEditingGroup(null)
        }}
        isSubmitting={updateGroup.isPending}
      />

      {/* AlertDialog suppression */}
      <AlertDialog
        open={!!groupToDelete}
        onOpenChange={(open) => { if (!open) setGroupToDelete(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer «&nbsp;{groupToDelete?.name}&nbsp;»&nbsp;?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le groupe sera supprimé ainsi que tous ses{' '}
              <strong>membres</strong>, <strong>posts associés</strong> et la{' '}
              <strong>source RSS</strong> liée (si existante).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (groupToDelete) {
                  deleteGroup.mutate(groupToDelete.id)
                  setGroupToDelete(null)
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
