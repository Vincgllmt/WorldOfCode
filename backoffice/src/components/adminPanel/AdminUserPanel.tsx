'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MoreVertical, MapPin, Briefcase, Link as LinkIcon, FileText, Flag } from 'lucide-react'

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

// ─── Types ───────────────────────────────────────────────────────────────────

type SortKey = 'postCount' | 'followerCount' | 'creationDate' | null

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminUserPanel() {
  const { users, isLoading } = useAdminUsers()
  const updateUser = useAdminUpdateUser()
  const deleteUser = useAdminDeleteUser()

  // Filtres
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'ROLE_USER' | 'ROLE_ADMIN' | ''>('')
  const [filterDateFrom, setFilterDateFrom] = useState<string>('')
  const [filterDateTo, setFilterDateTo] = useState<string>('')

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Sheet détail utilisateur (Story 3.3)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const { userDetail, isLoading: isLoadingDetail } = useAdminUserDetail(selectedUserId)

  // AlertDialog changement de rôle (Story 3.4)
  const [pendingRoleChange, setPendingRoleChange] = useState<{
    userId: number
    username: string
    currentRole: 'ROLE_USER' | 'ROLE_ADMIN'
    newRole: 'ROLE_USER' | 'ROLE_ADMIN'
  } | null>(null)

  // AlertDialog suppression (Story 3.5)
  const [userToDelete, setUserToDelete] = useState<{ id: number; username: string } | null>(null)

  // ─── Tri ─────────────────────────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  // ─── Filtrage + tri ───────────────────────────────────────────────────────

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

  // ─── Handlers mutations ───────────────────────────────────────────────────

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

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div className="space-y-6 p-6 rounded-xl shadow-sm border bg-card mb-5">
      <h2 className="text-xl font-bold">Gestion des utilisateurs</h2>

      {/* Filtres (Story 3.2) */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Input
            placeholder="Rechercher par username ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-sm w-full"
          />
          <Select value={filterRole || 'ALL'} onValueChange={(val) => setFilterRole(val === 'ALL' ? '' : val as typeof filterRole)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les rôles</SelectItem>
              <SelectItem value="ROLE_USER">Utilisateur</SelectItem>
              <SelectItem value="ROLE_ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Inscrit depuis</label>
            <Input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">jusqu&apos;au</label>
            <Input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('')
              setFilterRole('')
              setFilterDateFrom('')
              setFilterDateTo('')
            }}
          >
            Réinitialiser
          </Button>
        </div>
      </div>

      {/* Table (Stories 3.1, 3.3, 3.4) */}
      <PaginatedTable
        data={sortedUsers}
        itemsPerPage={10}
        headers={
          <>
            <TableHead className="w-10"></TableHead>
            <TableHead>Username</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => toggleSort('creationDate')}
            >
              Inscrit le{sortIndicator('creationDate')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => toggleSort('postCount')}
            >
              Posts{sortIndicator('postCount')}
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => toggleSort('followerCount')}
            >
              Followers{sortIndicator('followerCount')}
            </TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        }
        renderRow={(user) => (
          <TableRow
            key={user.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => setSelectedUserId(user.id)}
          >
            {/* Avatar */}
            <TableCell>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.username}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-xs font-medium text-muted-foreground">
                    {user.username[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </TableCell>

            <TableCell className="font-medium">{user.username}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>

            {/* Rôle avec sélecteur (Story 3.4) */}
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
                <SelectTrigger className="w-[130px] h-7 text-xs">
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
            <TableCell className="text-right text-sm">{user.postCount}</TableCell>
            <TableCell className="text-right text-sm">{user.followerCount}</TableCell>

            {/* Actions (Story 3.5) */}
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Options">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSelectedUserId(user.id)}>
                    Voir le profil
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setUserToDelete({ id: user.id, username: user.username })}
                    className="text-destructive"
                  >
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        )}
      />

      {/* Sheet détail utilisateur (Story 3.3) */}
      <Sheet open={!!selectedUserId} onOpenChange={(open) => { if (!open) setSelectedUserId(null) }}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Profil utilisateur</SheetTitle>
          </SheetHeader>

          {isLoadingDetail ? (
            <div className="space-y-3 mt-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : userDetail ? (
            <div className="mt-4 space-y-5">
              {/* Header avatar + nom */}
              <div className="flex items-center gap-3">
                {userDetail.avatarUrl ? (
                  <img
                    src={userDetail.avatarUrl}
                    alt={userDetail.username}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-lg font-medium text-muted-foreground">
                      {userDetail.username[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-base">
                    {userDetail.firstname} {userDetail.lastname}
                  </p>
                  <p className="text-sm text-muted-foreground">@{userDetail.username}</p>
                  <p className="text-xs text-muted-foreground">{userDetail.email}</p>
                </div>
              </div>

              {/* Bio */}
              {userDetail.bio && (
                <p className="text-sm text-muted-foreground italic border-l-2 pl-3">
                  {userDetail.bio}
                </p>
              )}

              {/* Infos */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {userDetail.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {userDetail.location}
                  </span>
                )}
                {userDetail.availability && (
                  <Badge variant="outline" className="text-xs">
                    {userDetail.availability}
                  </Badge>
                )}
              </div>

              {/* Skills */}
              {userDetail.skills.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Compétences</p>
                  <div className="flex flex-wrap gap-1">
                    {userDetail.skills.map((skill) => (
                      <Badge key={skill.id} variant="secondary" className="text-xs">
                        {skill.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Liens */}
              {userDetail.links.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Liens</p>
                  <div className="space-y-1">
                    {userDetail.links.map((link) => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <LinkIcon className="h-3 w-3" />
                        {link.type} — {link.url}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Expériences */}
              {userDetail.experiences && userDetail.experiences.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                    <Briefcase className="h-3 w-3 inline mr-1" />
                    Expériences
                  </p>
                  <div className="space-y-2">
                    {userDetail.experiences.map((exp, i) => (
                      <div key={i} className="text-xs border-l-2 pl-2">
                        <p className="font-medium">{exp.title} — {exp.company}</p>
                        <p className="text-muted-foreground">
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
                <div className="flex items-center gap-2 rounded-md bg-orange-50 border border-orange-200 px-3 py-2">
                  <Flag className="h-4 w-4 text-orange-500" />
                  <p className="text-sm text-orange-700">
                    {userDetail.reportCountOnPosts} report{userDetail.reportCountOnPosts !== 1 ? 's' : ''} sur les posts de cet utilisateur
                  </p>
                </div>
              )}

              {/* 5 derniers posts */}
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Derniers posts
                </p>
                {userDetail.lastFivePosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun post publié</p>
                ) : (
                  <div className="space-y-2">
                    {userDetail.lastFivePosts.map((post) => (
                      <div key={post.id} className="text-xs border rounded-md px-2 py-1.5">
                        <p className="text-muted-foreground truncate">
                          {post.excerpt ?? '(sans contenu)'}
                        </p>
                        <p className="text-muted-foreground mt-0.5">
                          {new Date(post.createdAt).toLocaleDateString('fr-FR')}
                          {' · '}{post.likesCount} like{post.likesCount !== 1 ? 's' : ''}
                          {' · '}{post.commentsCount} commentaire{post.commentsCount !== 1 ? 's' : ''}
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

      {/* AlertDialog changement de rôle (Story 3.4) */}
      <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer le changement de rôle</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de changer le rôle de{' '}
              <span className="font-semibold">{pendingRoleChange?.username}</span> de{' '}
              <span className="font-semibold">
                {pendingRoleChange?.currentRole === 'ROLE_ADMIN' ? 'Admin' : 'Utilisateur'}
              </span>{' '}
              vers{' '}
              <span className="font-semibold">
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

      {/* AlertDialog suppression (Story 3.5) */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;utilisateur</AlertDialogTitle>
            <AlertDialogDescription>
              Vous êtes sur le point de supprimer{' '}
              <span className="font-semibold">{userToDelete?.username}</span>.{' '}
              Les posts, commentaires et abonnements de cet utilisateur seront définitivement supprimés.
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
