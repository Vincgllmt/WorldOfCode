'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MoreVertical } from 'lucide-react'

import { useGroups } from '@/hooks/useGroups'
import { usePosts, useUpdatePost, useDeletePost } from '@/hooks/usePosts'
import { Post } from '@/interfaces/post'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
import { PaginatedTable } from '../shared/PaginationTable'

export default function AdminPostPanel() {
  const { posts, isLoading } = usePosts()
  const { groups } = useGroups()
  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<{ content: string; groupId: number }>({
    content: '',
    groupId: 0,
  })

  const [filterGroup, setFilterGroup] = useState<number | 'ALL'>('ALL')
  const [searchContent, setSearchContent] = useState('')

  const startEditing = (post: Post) => {
    setEditingId(post.id)
    setForm({ content: post.content, groupId: post.techGroupId })
  }

  const handleUpdate = () => {
    if (!editingId) return
    updatePost.mutate(
      { id: editingId, data: form },
      {
        onSuccess: () => {
          toast.success('Post mis à jour ✅')
          setEditingId(null)
        },
        onError: () => toast.error('Erreur lors de la mise à jour ❌'),
      }
    )
  }

  const handleDelete = (id: number) => {
    deletePost.mutate(id, {
      onSuccess: () => toast.success('Post supprimé 🗑️'),
      onError: () => toast.error('Erreur lors de la suppression ❌'),
    })
  }

  const filteredPosts = posts?.filter((post) => {
    const matchesGroup = filterGroup === 'ALL' || post.techGroupId === filterGroup
    const matchesSearch = post.content.toLowerCase().includes(searchContent.toLowerCase())
    return matchesGroup && matchesSearch
  }) || []

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div className="space-y-6 p-6 rounded-xl shadow-sm border bg-green-50 mb-5">
      <h2 className="text-xl font-bold">Gestion des posts</h2>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full">
          <Input
            placeholder="Rechercher un post..."
            value={searchContent}
            onChange={(e) => setSearchContent(e.target.value)}
            className="sm:max-w-sm w-full"
          />
          <Select
            value={String(filterGroup)}
            onValueChange={(val) => setFilterGroup(val === 'ALL' ? 'ALL' : parseInt(val))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrer par groupe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les groupes</SelectItem>
              {groups?.map((group) => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setSearchContent('')
            setFilterGroup('ALL')
          }}
        >
          Réinitialiser
        </Button>
      </div>

      <PaginatedTable
        data={filteredPosts}
        itemsPerPage={5}
        headers={
          <>
            <TableHead>ID</TableHead>
            <TableHead>Contenu</TableHead>
            <TableHead>Groupe</TableHead>
            <TableHead>Auteur</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        }
        renderRow={(post) => (
          <TableRow key={post.id}>
            <TableCell>{post.id}</TableCell>
            <TableCell className="max-w-[200px] whitespace-normal break-words">
              {editingId === post.id ? (
                <Input
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                />
              ) : (
                post.content
              )}
            </TableCell>
            <TableCell>
              {editingId === post.id ? (
                <Select
                  value={String(form.groupId)}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, groupId: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Groupe" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                groups?.find((g) => g.id === post.techGroupId)?.name || '—'
              )}
            </TableCell>
            <TableCell>{post.authorUsername || '—'}</TableCell>
            <TableCell className="text-right">
              {editingId === post.id ? (
                <Button size="sm" onClick={handleUpdate}>
                  Sauvegarder
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Options">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(post)}>
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(post.id)}
                      className="text-destructive"
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TableCell>
          </TableRow>
        )}
      />
    </div>
  )
}
