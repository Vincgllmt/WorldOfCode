'use client'

import { useGroups, useCreateGroup, useDeleteGroup, useUpdateGroup } from '@/hooks/useGroups'
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
import { MoreVertical } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

export default function AdminGroupPanel() {
  const { groups, isLoading, error } = useGroups()
  const createGroup = useCreateGroup()
  const deleteGroup = useDeleteGroup()
  const updateGroup = useUpdateGroup()

  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const [editingGroupId, setEditingGroupId] = useState<number | null>(null)
  const [editGroupForm, setEditGroupForm] = useState({ name: '', description: '' })

  const handleCreate = () => {
    if (newGroup.name.trim()) {
      createGroup.mutate(newGroup)
      setNewGroup({ name: '', description: '' })
    }
  }

  const confirmDelete = () => {
    if (selectedGroupId) {
      deleteGroup.mutate(selectedGroupId)
      setSelectedGroupId(null)
    }
  }

  const startEditing = (groupId: number, name: string, description: string) => {
    setEditingGroupId(groupId)
    setEditGroupForm({ name, description })
  }

  const handleUpdate = () => {
    if (editingGroupId) {
      updateGroup.mutate({
        id: editingGroupId,
        name: editGroupForm.name,
        description: editGroupForm.description,
      })
      setEditingGroupId(null)
    }
  }

  return (
    <div className="space-y-6 bg-card p-6 rounded-xl shadow-sm border mb-5">
      <h2 className="text-xl font-bold">Gestion des Groupes</h2>

      {/* ➕ Création */}
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

      {/* 📄 Liste des groupes */}
      <CardHeader>
        <CardTitle>Liste des groupes</CardTitle>
      </CardHeader>

      {isLoading ? (
        <p>Chargement...</p>
      ) : error ? (
        <p>Erreur lors du chargement des groupes.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups?.map((group) => (
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
                      onClick={() => startEditing(group.id, group.name, group.description)}
                    >
                      ✏️ Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSelectedGroupId(group.id)}
                      className="text-red-600"
                    >
                      🗑️ Supprimer
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
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{group.description}</p>
                  </CardContent>
                </>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={selectedGroupId !== null} onOpenChange={() => setSelectedGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce groupe ?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Confirmer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
