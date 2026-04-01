'use client'

import { useAdminGroups, useCreateGroup, useDeleteGroup, useUpdateGroup } from '@/hooks/useAdminGroups'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Users, FileText, Calendar, User as UserIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

type SortBy = 'memberCount' | 'postCount' | 'createdAt'

export default function AdminGroupPanel() {
  const { groups, isLoading, error } = useAdminGroups()
  const queryClient = useQueryClient()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()
  const updateGroup = useUpdateGroup()

  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editGroupForm, setEditGroupForm] = useState({ name: '', description: '' })

  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<SortBy>('createdAt')

  const filteredGroups = groups
    .filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'memberCount') return b.memberCount - a.memberCount
      if (sortBy === 'postCount') return b.postCount - a.postCount
      return String(b.createdAt).localeCompare(String(a.createdAt))
    })

  const handleCreate = () => {
    if (newGroup.name.trim()) {
      createGroup.mutate(newGroup, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminGroups'] })
          setNewGroup({ name: '', description: '' })
        },
      })
    }
  }

  const confirmDelete = () => {
    if (selectedGroupId) {
      deleteGroup.mutate(selectedGroupId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['adminGroups'] })
          setSelectedGroupId(null)
        },
      })
    }
  }

  const startEditing = (groupId: number, name: string, description: string) => {
    setEditingGroupId(groupId)
    setEditGroupForm({ name, description })
  }

  const handleUpdate = () => {
    if (editingGroupId) {
      updateGroup.mutate(
        { id: editingGroupId, name: editGroupForm.name, description: editGroupForm.description },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminGroups'] })
            setEditingGroupId(null)
          },
        }
      )
    }
  }

  return (
    <div className="space-y-6 bg-card p-6 rounded-xl shadow-sm border mb-5">
      <h2 className="text-xl font-bold">Gestion des Groupes</h2>

      {/* Création */}
      <Card>
        <CardHeader>
          <CardTitle>Créer un groupe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Nom du groupe"
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
          />
          <Textarea
            placeholder="Description"
            value={newGroup.description}
            onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
          />
          <Button onClick={handleCreate}>Créer</Button>
        </CardContent>
      </Card>

      {/* Liste des groupes */}
      <CardHeader>
        <CardTitle>Liste des groupes</CardTitle>
      </CardHeader>

      {/* Recherche + tri */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Rechercher un groupe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] border rounded-md px-3 py-2 text-sm bg-background"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="border rounded-md px-3 py-2 text-sm bg-background"
        >
          <option value="createdAt">Par date</option>
          <option value="memberCount">Par membres</option>
          <option value="postCount">Par posts</option>
        </select>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-sm text-muted-foreground underline hover:text-foreground"
          >
            Effacer
          </button>
        )}
      </div>

      {isLoading ? (
        <p>Chargement...</p>
      ) : error ? (
        <p>Erreur lors du chargement des groupes.</p>
      ) : (
        <>
          {filteredGroups.length === 0 && search && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Aucun groupe correspondant à &ldquo;{search}&rdquo;
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <Card key={group.id} className="relative">
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => startEditing(group.id, group.name, group.description ?? '')}
                      >
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setSelectedGroupId(group.id)}
                        className="text-red-600"
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {editingGroupId === group.id ? (
                  <CardContent className="space-y-2 pt-6">
                    <Input
                      value={editGroupForm.name}
                      onChange={(e) =>
                        setEditGroupForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                      placeholder="Nom du groupe"
                    />
                    <Textarea
                      value={editGroupForm.description}
                      onChange={(e) =>
                        setEditGroupForm((prev) => ({ ...prev, description: e.target.value }))
                      }
                      placeholder="Description"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setEditingGroupId(null)}>
                        Annuler
                      </Button>
                      <Button onClick={handleUpdate}>Enregistrer</Button>
                    </div>
                  </CardContent>
                ) : (
                  <>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{group.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.description && (
                        <p className="text-sm text-muted-foreground">{group.description}</p>
                      )}
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border-t pt-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {group.memberCount} membre{group.memberCount !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {group.postCount} post{group.postCount !== 1 ? 's' : ''}
                        </span>
                        {group.creatorUsername && (
                          <span className="flex items-center gap-1 col-span-2">
                            <UserIcon className="h-3 w-3" />
                            Créé par <strong className="ml-0.5">{group.creatorUsername}</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1 col-span-2">
                          <Calendar className="h-3 w-3" />
                          {new Date(group.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={selectedGroupId !== null} onOpenChange={() => setSelectedGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce groupe ?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
