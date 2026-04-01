'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useGroups } from '@/hooks/useGroups'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import GroupJoinToggle from '@/components/group/GroupJoinToggle'
import GroupSuggestionForm from '@/components/groups/GroupSuggestionForm'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Check } from 'lucide-react'
import { motion } from 'framer-motion'

export default function GroupsPage() {
  const { groups, isLoading, error } = useGroups()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')

  const filteredGroups = useMemo(() => {
    if (!groups) return []
    const sorted = [...groups].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    if (!searchTerm.trim()) return sorted
    const term = searchTerm.trim().toLowerCase()
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const startRegex = new RegExp(`(^|[\\s/])${escaped}`, 'i')
    return sorted.filter((group) => startRegex.test(group.name))
  }, [groups, searchTerm])

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full sm:w-80" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  if (error) return <p className="text-red-500 p-4">Erreur lors du chargement des groupes.</p>

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold font-mono">
        <span className="text-primary">&lt;</span>Groupes<span className="text-primary">/&gt;</span>
      </h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Rejoignez des communautés et restez informé de leurs actualités.
        </p>
        <div className="flex items-center gap-3">
          {user && <GroupSuggestionForm />}
          <div className="relative sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Rechercher un groupe..."
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {searchTerm.trim() && (
        <p className="text-xs text-muted-foreground">
          {filteredGroups.length} résultat{filteredGroups.length !== 1 ? 's' : ''} pour « {searchTerm} »
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.length === 0 ? (
          <p className="col-span-full text-center text-sm text-muted-foreground py-12">
            Aucun groupe ne correspond à votre recherche.
          </p>
        ) : (
          filteredGroups.map((group, index) => {
            const memberCount = group.users?.length ?? 0
            const isJoined = group.joinedByUser === true

            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.8), duration: 0.3 }}
                whileHover={{ y: -3 }}
              >
                <Link href={`/group/${group.id}`} className="block h-full">
                <Card className="relative h-full border border-border/50 bg-card transition-all hover:border-border hover:shadow-md cursor-pointer">
                  <CardHeader className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base font-semibold leading-tight">
                          {group.name}
                        </CardTitle>
                      </div>
                      <GroupJoinToggle group={group} />
                    </div>

                    {group.description ? (
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                        {group.description}
                      </p>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Pas de description.</p>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      {memberCount > 0 && (
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {memberCount} membre{memberCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {isJoined && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1 text-emerald-600">
                          <Check className="h-3 w-3" />
                          Rejoint
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Card>
                </Link>
              </motion.div>
            )
          })
        )}
      </div>
    </div>
  )
}
