'use client'

import { Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePinPost, useUnpinPost } from '@/hooks/useProfileHighlights'

type Props = {
  postId: number
  userId: number
  isPinned: boolean
  isOwnProfile: boolean
  isMaxReached: boolean
}

export default function PinPostButton({ postId, userId, isPinned, isOwnProfile, isMaxReached }: Props) {
  if (!isOwnProfile) return null

  const { mutate: pin, isPending: pinning } = usePinPost(userId)
  const { mutate: unpin, isPending: unpinning } = useUnpinPost(userId)

  const isDisabled = !isPinned && isMaxReached

  return (
    <Button
      variant={isPinned ? 'secondary' : 'ghost'}
      size="sm"
      disabled={isDisabled || pinning || unpinning}
      title={isDisabled ? 'Limite de 3 posts atteinte' : undefined}
      onClick={() => isPinned ? unpin(postId) : pin(postId)}
      className="h-7 gap-1.5 px-2 text-xs"
    >
      <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
      {isPinned ? 'Épinglé' : 'Épingler'}
    </Button>
  )
}
