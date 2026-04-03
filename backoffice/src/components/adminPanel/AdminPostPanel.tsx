'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

import { useAdminPosts, useAdminDeletePost } from '@/hooks/useAdminPosts'

import { Input } from '@/components/ui/input'
import { TableCell, TableHead, TableRow } from '@/components/ui/table'
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

type SortKey = 'likesCount' | 'commentsCount' | 'reportsCount' | 'createdAt' | null

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminPostPanel() {
  const { posts, isLoading } = useAdminPosts()
  const deletePost = useAdminDeletePost()

  // Filtres
  const [search, setSearch] = useState('')
  const [minReports, setMinReports] = useState<number>(0)

  // Tri
  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // AlertDialog suppression (Story 5.2)
  const [postToDelete, setPostToDelete] = useState<{
    id: number
    excerpt: string | null
  } | null>(null)

  // ─── Tri ──────────────────────────────────────────────────────────────────

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sortIndicator = (key: SortKey) =>
    sortKey === key ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''

  // ─── Filtrage + tri ────────────────────────────────────────────────────────

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      !search ||
      (post.excerpt ?? '').toLowerCase().includes(search.toLowerCase()) ||
      post.authorUsername.toLowerCase().includes(search.toLowerCase())

    const matchesMinReports = post.reportsCount >= minReports

    return matchesSearch && matchesMinReports
  })

  const sortedPosts = [...filteredPosts].sort((a, b) => {
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

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <>
      <div className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Input
            placeholder="Rechercher par contenu ou auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-sm w-full"
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">Reports min.</label>
            <Input
              type="number"
              min={0}
              value={minReports}
              onChange={(e) => setMinReports(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-20 text-center"
            />
          </div>
          {(search || minReports > 0) && (
            <button
              onClick={() => { setSearch(''); setMinReports(0) }}
              className="text-sm text-muted-foreground underline hover:text-foreground"
            >
              Réinitialiser
            </button>
          )}
        </div>

        <PaginatedTable
          data={sortedPosts}
          itemsPerPage={10}
          headers={
            <>
              <TableHead>Auteur</TableHead>
              <TableHead>Extrait</TableHead>
              <TableHead>Groupe</TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => toggleSort('likesCount')}
              >
                Likes{sortIndicator('likesCount')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => toggleSort('commentsCount')}
              >
                Commentaires{sortIndicator('commentsCount')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none text-right"
                onClick={() => toggleSort('reportsCount')}
              >
                Reports{sortIndicator('reportsCount')}
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => toggleSort('createdAt')}
              >
                Date{sortIndicator('createdAt')}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </>
          }
          renderRow={(post) => (
            <TableRow key={post.id}>
              <TableCell className="font-medium">{post.authorUsername}</TableCell>
              <TableCell className="max-w-[200px]">
                <p className="text-sm truncate">{post.excerpt ?? '(sans contenu)'}</p>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {post.techGroupName ?? '—'}
              </TableCell>
              <TableCell className="text-right text-sm">{post.likesCount}</TableCell>
              <TableCell className="text-right text-sm">{post.commentsCount}</TableCell>
              <TableCell className="text-right text-sm">
                {post.reportsCount > 0 ? (
                  <span className="font-medium text-orange-600">{post.reportsCount}</span>
                ) : (
                  <span>0</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(post.createdAt).toLocaleDateString('fr-FR')}
              </TableCell>
              <TableCell className="text-right">
                <button
                  onClick={() => setPostToDelete({ id: post.id, excerpt: post.excerpt })}
                  className="text-destructive hover:text-destructive/80 text-sm"
                >
                  Supprimer
                </button>
              </TableCell>
            </TableRow>
          )}
        />
      </div>

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
