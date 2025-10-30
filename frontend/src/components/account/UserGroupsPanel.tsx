'use client'

import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type UserGroupsPanelProps = {
  groups: ReadonlyArray<{
    id: number
    name: string
  }>
  className?: string
}

export default function UserGroupsPanel({ groups, className }: UserGroupsPanelProps) {
  const hasGroups = groups.length > 0

  return (
    <section className={cn('rounded-2xl border border-border/70 bg-card p-6 shadow-sm', className)}>
      <h2 className="text-lg font-semibold">Groupes rejoints</h2>

      {hasGroups ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/group/${group.id}`} className="no-underline">
              <Badge
                variant="secondary"
                className="inline-flex items-center px-3 py-1 text-sm transition-colors hover:bg-secondary/80"
              >
                {group.name}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Aucun groupe rejoint pour le moment.
        </p>
      )}
    </section>
  )
}
