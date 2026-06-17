'use client'

import { PinOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ProfileHighlight } from '@/interfaces/user'

type Props = {
  highlight: ProfileHighlight
  isOwnProfile: boolean
  onUnpin: () => void
}

const truncate = (text: string, max = 280) =>
  text.length > max ? text.slice(0, max) + '…' : text

export default function HighlightCard({ highlight, isOwnProfile, onUnpin }: Props) {
  return (
    <div className="relative rounded-xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-gradient-to-r from-primary to-teal-500" />

      <div className="mt-1 space-y-2">
        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          Temps fort
        </span>

        <p className="text-sm text-foreground leading-relaxed">
          {truncate(highlight.postContent)}
        </p>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">@{highlight.postAuthor}</span>
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUnpin}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <PinOff className="h-3.5 w-3.5" />
              Désépingler
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
