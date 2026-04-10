'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MoreVertical, MapPin, Briefcase, Link as LinkIcon, FileText, Flag, Search, SlidersHorizontal, X } from 'lucide-react'

import { useAdminUsers, useAdminUpdateUser, useAdminDeleteUser } from '@/hooks/useAdminUsers'
import { useAdminUserDetail } from '@/hooks/useAdminUserDetail'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { PaginatedTable } from '../shared/PaginationTable'

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'postCount' | 'followerCount' | 'creationDate' | null

// ─── Composant skeleton de chargement ─────────────────────────────────────────

function UserPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="bg-muted/40 border-b border-border px-4 py-3 flex gap-8">
          {['', 'Username', 'Email', 'Rôle', 'Inscrit le', 'Posts', 'Followers', ''].map((h, i) => (
            <Skeleton key={i} className="h-3.5 w-16" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 last:border-0 px-4 py-3.5 flex items-center gap-8">
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-40" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-8 ml-auto" />
            <Skeleton className="h-3.5 w-8" />
            <Skeleton className="h-7 w-7 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminUserPanel() {
  const { users, isLoading } = useAdminUsers()
  const updateUser = useAdminUpdateUser()
  const deleteUser = useAdminDeleteUser()

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'ROLE_USER' | 'ROLE_ADMIN' | ''>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const { userDetail, isLoading: isLoadingDetail } = useAdminUserDetail(selectedUserId)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: number
    username: string
    currentRole: 'ROLE_USER' | 'ROLE_ADMIN'
    newRole: 'ROLE_USER' | 'ROLE_ADMIN'
  } | null>(null)
  const [userToDelete, setUserToDelete] = useState<{ id: number; username: string } | null>(null)

  const hasFilters = search || filterRole || filterDateFrom || filterDateTo

  const toggleSort = (key: SortKey) => {
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

  const filteredUsers = (users ?? []).filter((user) => {
    const matchesSearch =
      !search ||
      user.username.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = !filterRole || user.role === filterRole
    const userDate = user.creationDate.slice(0, 10)
    const matchesDateFrom = !filterDateFrom || userDate >= filterDateFrom
    const matchesDateTo = !filterDateTo || userDate <= filterDateTo
    return matchesSearch && matchesRole && matchesDateFrom && matchesDateTo
  })

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (!sortKey) return 0
    const valA = a[sortKey]
    const valB = b[sortKey]
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDir === 'asc' ? valA - valB : valB - valA
    }
    return sortDir === 'asc'
      ? String(valA).localeCompare(String(valB))
      : String(valB).localeCompare(String(valA))
  })

  const handleConfirmRoleChange = () => {
    if (!pendingRoleChange) return
    updateUser.mutate(
      { id: pendingRoleChange.userId, username: pendingRoleChange.username, role: pendingRoleChange.newRole },
      {
        onSuccess: () => toast.success('Rôle mis à jour'),
        onError: () => toast.error('Erreur lors de la mise à jour'),
      }
    )
    setPendingRoleChange(null)
  }

  const handleConfirmDelete = () => {
    if (!userToDelete) return
    deleteUser.mutate(userToDelete.id, {
      onSuccess: () => toast.success('Utilisateur supprimé'),
      onError: () => toast.error('Erreur lors de la suppression'),
    })
    setUserToDelete(null)
  }

  const resetFilters = () => {
    setSearch('')
    setFilterRole('')
    setFilterDateFrom('')
    setFilterDateTo('')
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher username, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={filterRole || 'ALL'} onValueChange={(val) => setFilterRole(val === 'ALL' ? '' : val as typeof filterRole)}>
          <SelectTrigger className="h-9 w-[150px] text-sm">
            <SelectValue placeholder="Tous les rôles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les rôles</SelectItem>
            <SelectItem value="ROLE_USER">Utilisateur</SelectItem>
            <SelectItem value="ROLE_ADMIN">Admin</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" />
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

        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-9 px-3 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Effacer
          </Button>
        )}

        {!isLoading && (
          <span className="ml-auto text-xs text-muted-foreground font-mono">
            {sortedUsers.length} résultat{sortedUsers.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <UserPanelSkeleton />
      ) : (
        <PaginatedTable
          data={sortedUsers}
          itemsPerPage={10}
          emptyState={
            <div className="flex flex-col items-center gap-2 py-2">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p>Aucun utilisateur trouvé</p>
            </div>
          }
          headers={
            <>
              <TableHead className="w-10 pl-4"></TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Username</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Email</TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground">Rôle</TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={() => toggleSort('creationDate')}
              >
                Inscrit le{sortIndicator('creationDate')}
              </TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none text-right hover:text-foreground transition-colors"
                onClick={() => toggleSort('postCount')}
              >
                Posts{sortIndicator('postCount')}
              </TableHead>
              <TableHead
                className="text-xs font-semibold text-muted-foreground cursor-pointer select-none text-right hover:text-foreground transition-colors"
                onClick={() => toggleSort('followerCount')}
              >
                Followers{sortIndicator('followerCount')}
              </TableHead>
              <TableHead className="text-xs font-semibold text-muted-foreground text-right pr-4">Actions</TableHead>
            </>
          }
          renderRow={(user) => (
            <TableRow
              key={user.id}
              className="cursor-pointer hover:bg-muted/40 transition-colors border-border/50"
              onClick={() => setSelectedUserId(user.id)}
            >
              <TableCell className="pl-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-border">
                    <span className="text-xs font-semibold text-primary">
                      {user.username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </TableCell>

              <TableCell className="font-medium text-sm">{user.username}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>

              <TableCell onClick={(e) => e.stopPropagation()}>
                <Select
                  value={user.role}
                  onValueChange={(newRole) => {
                    if (newRole !== user.role) {
                      setPendingRoleChange({
                        userId: user.id,
                        username: user.username,
                        currentRole: user.role,
                        newRole: newRole as 'ROLE_USER' | 'ROLE_ADMIN',
                      })
                    }
                  }}
                >
                  <SelectTrigger className="w-[130px] h-7 text-xs border-border/60">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROLE_USER">Utilisateur</SelectItem>
                    <SelectItem value="ROLE_ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>

              <TableCell className="text-sm text-muted-foreground">
                {new Date(user.creationDate).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell className="text-right text-sm font-mono">{user.postCount}</TableCell>
              <TableCell className="text-right text-sm font-mono">{user.followerCount}</TableCell>

              <TableCell className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" aria-label="Options">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => setSelectedUserId(user.id)}>
                      Voir le profil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setUserToDelete({ id: user.id, username: user.username })}
                      className="text-destructive focus:text-destructive"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          )}
        />
      )}

      {/* Sheet détail utilisateur */}
      <Sheet open={!!selectedUserId} onOpenChange={(open) => { if (!open) setSelectedUserId(null) }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto border-border px-6">
          <SheetHeader className="border-b border-border pb-4 -mx-6 px-6">
            <SheetTitle className="text-base font-bold">Profil utilisateur</SheetTitle>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="space-y-4 mt-5 pb-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          ) : userDetail ? (
            <div className="mt-5 space-y-5 pb-6">
              {/* Header avatar + nom */}
              <div className="flex items-center gap-3">
                {userDetail.avatarUrl ? (
                  <img
                    src={userDetail.avatarUrl}
                    alt={userDetail.username}
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                    <span className="text-xl font-bold text-primary">
                      {userDetail.username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-sm">
                    {userDetail.firstname} {userDetail.lastname}
                  </p>
                  <p className="text-xs text-muted-foreground">@{userDetail.username}</p>
                  <p className="text-xs text-muted-foreground">{userDetail.email}</p>
                </div>
              </div>

              {/* Bio */}
              {userDetail.bio && (
                <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-0.5 bg-muted/30 rounded-r-md">
                  {userDetail.bio}
                </p>
              )}

              {/* Infos */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {userDetail.location && (
                  <span className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
                    <MapPin className="h-3 w-3" />
                    {userDetail.location}
                  </span>
                )}
                {userDetail.availability && (
                  <Badge variant="outline" className="text-xs h-6">
                    {userDetail.availability}
                  </Badge>
                )}
              </div>

              {/* Skills */}
              {userDetail.skills.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Compétences
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {userDetail.skills.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="text-xs h-6">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Liens */}
              {userDetail.links.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Liens
                  </p>
                  <div className="space-y-1">
                    {userDetail.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3 shrink-0" />
                        <span className="font-medium">{link.type}</span>
                        <span className="text-muted-foreground truncate">— {link.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Expériences */}
              {userDetail.experiences && userDetail.experiences.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    Expériences
                  </p>
                  <div className="space-y-2">
                    {userDetail.experiences.map((exp, i) => (
                      <div key={i} className="text-xs border-l-2 border-border pl-3 py-0.5">
                        <p className="font-semibold">{exp.title} — {exp.company}</p>
                        <p className="text-muted-foreground text-[11px]">
                          {exp.startDate} → {exp.endDate ?? 'Présent'}
                        </p>
                        {exp.description && (
                          <p className="text-muted-foreground mt-0.5">{exp.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alerte reports */}
              {userDetail.reportCountOnPosts > 0 && (
                <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                  <Flag className="h-4 w-4 text-destructive shrink-0" />
                  <p className="text-xs text-destructive font-medium">
                    {userDetail.reportCountOnPosts} report{userDetail.reportCountOnPosts !== 1 ? 's' : ''} sur les posts de cet utilisateur
                  </p>
                </div>
              )}

              {/* 5 derniers posts */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Derniers posts
                </p>
                {userDetail.lastFivePosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun post publié</p>
                ) : (
                  <div className="space-y-1.5">
                    {userDetail.lastFivePosts.map((post) => (
                      <div key={post.id} className="text-xs rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                        <p className="text-muted-foreground truncate">
                          {post.excerpt ?? '(sans contenu)'}
                        </p>
                        <p className="text-muted-foreground/70 mt-1 font-mono text-[11px]">
                          {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                          {' · '}{post.likesCount}♡
                          {' · '}{post.commentsCount} comm.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* AlertDialog changement de rôle */}
      <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de rôle</AlertDialogTitle>
            <AlertDialogDescription>
              Modifier le rôle de{' '}
              <span className="font-semibold text-foreground">{pendingRoleChange?.username}</span> de{' '}
              <span className="font-semibold text-foreground">
                {pendingRoleChange?.currentRole === 'ROLE_ADMIN' ? 'Admin' : 'Utilisateur'}
              </span>{' '}
              vers{' '}
              <span className="font-semibold text-foreground">
                {pendingRoleChange?.newRole === 'ROLE_ADMIN' ? 'Admin' : 'Utilisateur'}
              </span>.
              Cette action est réversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingRoleChange(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRoleChange}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog suppression */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer{' '}
              <span className="font-semibold text-foreground">{userToDelete?.username}</span>.{' '}
              Ses posts, commentaires et abonnements seront définitivement supprimés.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
