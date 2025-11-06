'use client'

import { MouseEvent, useEffect, useMemo, useState } from 'react'
import { Loader2, LogOut, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Group } from '@/interfaces/group'
import { useToggleGroupMembership } from '@/hooks/useGroups'
import { useUserGroups } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

type GroupJoinToggleProps = {
  group: Group
  className?: string
  onChange?: (joined: boolean) => void
}

export default function GroupJoinToggle({ group, className, onChange }: GroupJoinToggleProps) {
  const { user } = useAuth()
  const { mutate, isPending } = useToggleGroupMembership()

  const initialMembership = group.joinedByUser
  const shouldInfer = typeof initialMembership === 'undefined' && !!user?.id
  const { data: myGroups } = useUserGroups(shouldInfer ? user?.id : undefined)
  const inferredMembership = useMemo(
    () => (shouldInfer ? Boolean(myGroups?.some((g) => g.id === group.id)) : undefined),
    [shouldInfer, myGroups, group.id]
  )

  const [isMember, setIsMember] = useState<boolean>(
    initialMembership ?? inferredMembership ?? false
  )

  useEffect(() => {
    if (typeof initialMembership !== 'undefined') {
      setIsMember(initialMembership)
    }
  }, [initialMembership])

  useEffect(() => {
    if (shouldInfer && typeof inferredMembership !== 'undefined') {
      setIsMember(inferredMembership)
    }
  }, [shouldInfer, inferredMembership])

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (isPending) return

    const previous = isMember
    const optimistic = !previous
    setIsMember(optimistic)

    mutate(
      { groupId: group.id, currentlyJoined: previous },
      {
        onSuccess: (joined) => {
          setIsMember(joined)
          onChange?.(joined)
        },
        onError: () => {
          setIsMember(previous)
        },
      }
    )
  }

  const { label, Icon } = useMemo(() => {
    return isMember
      ? { label: 'Se désabonner', Icon: LogOut }
      : { label: "S'abonner", Icon: UserPlus }
  }, [isMember])

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isMember}
      title={isMember ? 'Quitter ce groupe' : 'Rejoindre ce groupe'}
      variant={isMember ? 'muted' : 'secondary'}
      size="sm"
      className={cn(
        'group min-w-[150px] rounded-full font-medium transition-colors focus-visible:ring-2 focus-visible:ring-offset-2',
        isMember
          ? 'hover:bg-red-500/90 hover:text-white'
          : 'hover:bg-emerald-500/90 hover:text-white',
        className
      )}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Icon
          className={cn(
            'h-4 w-4',
            isMember ? 'text-destructive group-hover:text-white' : 'text-primary group-hover:text-white'
          )}
          aria-hidden
        />
      )}
      <span className="ml-2 text-sm">
        {isPending ? (isMember ? 'Désabonnement…' : 'Abonnement…') : label}
      </span>
    </Button>
  )
}
