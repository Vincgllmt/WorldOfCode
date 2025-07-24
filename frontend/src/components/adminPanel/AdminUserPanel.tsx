'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { MoreVertical } from 'lucide-react'

import { useUsers, useUpdateUser, useDeleteUser } from '@/hooks/useUsers'
import { User } from '@/interfaces/user'

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



export default function AdminUserPanel() {
  const { users, isLoading } = useUsers()
  const deleteUser = useDeleteUser()
  const updateUser = useUpdateUser()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<{ username: string; role: 'ROLE_USER' | 'ROLE_ADMIN' }>({
    username: '',
    role: 'ROLE_USER',
  })

  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<'ALL' | 'ROLE_USER' | 'ROLE_ADMIN'>('ALL')

  const startEditing = (user: User) => {
    setEditingId(user.id)
    setForm({ username: user.username, role: user.role })
  }

  const handleUpdate = () => {
    if (!editingId) return
    updateUser.mutate(
      { id: editingId, ...form },
      {
        onSuccess: () => {
          toast.success('Utilisateur mis à jour ✅')
          setEditingId(null)
        },
        onError: () => toast.error('Erreur lors de la mise à jour ❌'),
      }
    )
  }

  const handleDelete = (id: number) => {
    deleteUser.mutate(id, {
      onSuccess: () => toast.success('Utilisateur supprimé 🗑️'),
      onError: () => toast.error('Erreur lors de la suppression ❌'),
    })
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = user.username.toLowerCase().includes(search.toLowerCase())
    const matchesRole = filterRole === 'ALL' || user.role === filterRole
    return matchesSearch && matchesRole
  }) || []

  if (isLoading) return <p className="text-muted-foreground">Chargement...</p>

  return (
    <div className="space-y-6 p-6 rounded-xl shadow-sm border bg-blue-50 mb-5">
      <h2 className="text-xl font-bold">Gestion des utilisateurs</h2>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full">
          <Input
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-sm w-full"
          />
          <Select value={filterRole} onValueChange={(val) => setFilterRole(val as typeof filterRole)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les rôles</SelectItem>
              <SelectItem value="ROLE_USER">Utilisateur</SelectItem>
              <SelectItem value="ROLE_ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setSearch('')
            setFilterRole('ALL')
          }}
          className="sm:w-auto"
        >
          Réinitialiser
        </Button>
      </div>

      <PaginatedTable
        data={filteredUsers}
        itemsPerPage={5}
        headers={
          <>
            <TableHead>ID</TableHead>
            <TableHead>Nom d’utilisateur</TableHead>
            <TableHead>Rôle</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </>
        }
        renderRow={(user) => (
          <TableRow key={user.id}>
            <TableCell>{user.id}</TableCell>
            <TableCell>
              {editingId === user.id ? (
                <Input
                  value={form.username}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, username: e.target.value }))
                  }
                />
              ) : (
                user.username
              )}
            </TableCell>
            <TableCell>
              {editingId === user.id ? (
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      role: value as 'ROLE_USER' | 'ROLE_ADMIN',
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ROLE_USER">Utilisateur</SelectItem>
                    <SelectItem value="ROLE_ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              ) : user.role === 'ROLE_ADMIN' ? 'Admin' : 'Utilisateur'}
            </TableCell>
            <TableCell className="text-right">
              {editingId === user.id ? (
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
                    <DropdownMenuItem onClick={() => startEditing(user)}>
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(user.id)}
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
