'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useGroups } from '@/hooks/useGroups'
import { Card, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import GroupJoinToggle from '@/components/group/GroupJoinToggle'

export default function GroupsPage() {
  const { groups, isLoading, error } = useGroups()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredGroups = useMemo(() => {
    if (!groups) return []
    if (!searchTerm.trim()) return groups
    const term = searchTerm.toLowerCase()
    return groups.filter(
      (group) =>
        group.name.toLowerCase().includes(term) ||
        (group.description ?? '').toLowerCase().includes(term)
    )
  }, [groups, searchTerm])

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (error) return <p className="text-red-500 p-4">Erreur lors du chargement des groupes.</p>

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Groupes techniques</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Rejoignez des communautés et restez informé de leurs actualités.
        </p>
        <Input
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Rechercher un groupe…"
          className="sm:w-80"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.length === 0 ? (
          <p className="col-span-full text-center text-sm text-muted-foreground">
            Aucun groupe ne correspond à « {searchTerm} ».
          </p>
        ) : (
          filteredGroups.map((group) => (
            <Card
              key={group.id}
              className="flex h-full flex-col justify-between gap-4 border border-border/60 transition hover:border-border hover:shadow-sm"
          >
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>
                  <Link
                    href={`/group/${group.id}`}
                    className="text-lg font-semibold leading-tight tracking-tight hover:text-primary"
                  >
                    {group.name}
                  </Link>
                </CardTitle>
                {group.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {group.description}
                  </p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">Pas de description.</p>
                )}
              </div>
              <GroupJoinToggle group={group} />
            </CardHeader>
            <CardFooter className="justify-end">
              <Link
                href={`/group/${group.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Voir le groupe →
              </Link>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
