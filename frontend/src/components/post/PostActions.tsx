'use client'

import type { Post } from '@/interfaces/post'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Heart, MessageCircle, Send } from 'lucide-react'
import { usePostLikeState, useSharePost } from '@/hooks/usePosts'
import toast from 'react-hot-toast'

type Props = {
  post: Post
  className?: string
  onCommentClick?: () => void
  copyLinkOnShare?: boolean
  postUrl?: string
}

export default function PostActions({
  post,
  className,
  onCommentClick,
  copyLinkOnShare,
  postUrl,
}: Props) {
  const { likedByMe, likesCount, onToggle, isPending } = usePostLikeState(post.id, post.techGroupId)
  const share = useSharePost()

  const handleShare = async () => {
    share.mutate(post.id, {
      onSuccess: async () => {
        if (copyLinkOnShare && postUrl) {
          try {
            await navigator.clipboard.writeText(postUrl)
            toast.success('Lien du post copié 📋')
          } catch {/* ignore */}
        }
      },
    })
  }

  return (
    <div className={cn('pt-2', className)}>
      {/* Ligne des icônes comme Instagram */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', likedByMe && 'text-red-500')}
          onClick={onToggle}
          aria-pressed={likedByMe}
          aria-label={likedByMe ? 'Retirer le like' : 'Liker le post'}
          disabled={isPending}
        >
          <Heart className={cn('h-6 w-6', likedByMe && 'fill-current')} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCommentClick}
          aria-label="Commenter le post"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={handleShare}
          aria-label="Partager le post"
        >
          <Send className="h-6 w-6" />
        </Button>
      </div>

      {/* Ligne compteur "J'aime" */}
      <div className="mt-2 text-sm font-medium">
        {likesCount} {likesCount > 1 ? "J'aime" : "J'aime"}
      </div>
    </div>
  )
}
