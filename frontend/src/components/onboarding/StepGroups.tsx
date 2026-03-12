'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useGroups } from '@/hooks/useGroups'
import { useToggleGroupMembership } from '@/hooks/useGroups'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { Check, Search, Users } from 'lucide-react'

type Props = {
  onSuccess: () => void
  setIsSubmitting: (v: boolean) => void
}

export default function StepGroups({ onSuccess, setIsSubmitting }: Props) {
  const { groups, isLoading } = useGroups()
  const toggleMembership = useToggleGroupMembership()
  const [joinedIds, setJoinedIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const initializedRef = useRef(false)

  useEffect(() => {
    if (groups && !initializedRef.current) {
      const alreadyJoined = groups
        .filter((g) => g.joinedByUser === true)
        .map((g) => g.id)
      if (alreadyJoined.length > 0) {
        setJoinedIds(new Set(alreadyJoined))
      }
      initializedRef.current = true
    }
  }, [groups])

  const filteredGroups = useMemo(() => {
    if (!groups) return []
    if (!search.trim()) return groups
    const query = search.toLowerCase()
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(query) ||
        g.description.toLowerCase().includes(query)
    )
  }, [groups, search])

  const toggleGroup = (groupId: number) => {
    const currentlyJoined = joinedIds.has(groupId)

    toggleMembership.mutate(
      { groupId, currentlyJoined },
      {
        onSuccess: (joined) => {
          setJoinedIds((prev) => {
            const next = new Set(prev)
            if (joined) {
              next.add(groupId)
            } else {
              next.delete(groupId)
            }
            return next
          })
        },
      }
    )
  }

  const handleFinish = () => {
    if (joinedIds.size > 0) {
      toast.success(`${joinedIds.size} groupe${joinedIds.size > 1 ? 's' : ''} rejoint${joinedIds.size > 1 ? 's' : ''}`)
    }
    onSuccess()
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un groupe..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {(!groups || groups.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun groupe disponible pour le moment.
        </p>
      )}

      {groups && groups.length > 0 && filteredGroups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun groupe ne correspond à votre recherche.
        </p>
      )}

      <div className="max-h-72 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredGroups.map((group) => {
            const isJoined = joinedIds.has(group.id)

            return (
              <Card
                key={group.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  isJoined && 'border-green-600 ring-1 ring-green-600'
                )}
                onClick={() => toggleGroup(group.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="font-medium text-sm truncate">{group.name}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {group.description}
                      </p>
                    </div>
                    {isJoined && (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {joinedIds.size} groupe{joinedIds.size !== 1 ? 's' : ''} sélectionné{joinedIds.size !== 1 ? 's' : ''}
      </p>

      <Button
        type="button"
        onClick={handleFinish}
        className="w-full gap-2"
      >
        Terminer
        <Check className="h-4 w-4" />
      </Button>
    </div>
  )
}
