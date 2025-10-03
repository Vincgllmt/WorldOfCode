'use client'

import * as React from 'react'
import type { Post } from '@/interfaces/post'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Heart, MessageCircle, Send } from 'lucide-react'
import { useSharePost, usePostLikeState } from '@/hooks/usePosts'
import toast from 'react-hot-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type PostActionsProps = {
  post: Post
  className?: string
  onCommentClick?: () => void
  /** Copie l’URL du post lors du partage */
  copyLinkOnShare?: boolean
  postUrl?: string
}

export default function PostActions({
  post,
  className,
  onCommentClick,
  copyLinkOnShare = false,
  postUrl,
}: PostActionsProps) {
  // Etat like dérivé depuis la liste des likers (persiste au refresh)
  const { likedByMe, likesCount, onToggle, isPending } = usePostLikeState(
    post.id,
    post.techGroupId
  )

  // Partage + confirmation
  const share = useSharePost()
  const [confirmShareOpen, setConfirmShareOpen] = React.useState(false)

  const handleConfirmShare = async () => {
    share.mutate(post.id, {
      onSuccess: async () => {
        if (copyLinkOnShare && postUrl) {
          try {
            await navigator.clipboard.writeText(postUrl)
            toast.success('Lien du post copié 📋')
          } catch {
            /* noop: l’API de partage a réussi, seule la copie a échoué */
          }
        }
      },
    })
  }

  return (
    <div className={cn('pt-2', className)}>
      {/* Ligne d’icônes à la Instagram */}
      <div className="flex items-center gap-4">
        {/* Like */}
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

        {/* Commenter */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCommentClick}
          aria-label="Commenter le post"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>

        {/* Partager (avec confirmation) */}
        <AlertDialog open={confirmShareOpen} onOpenChange={setConfirmShareOpen}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setConfirmShareOpen(true)}
            aria-label="Partager le post"
            disabled={share.isPending}
          >
            <Send className="h-6 w-6" />
          </Button>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Partager ce post ?</AlertDialogTitle>
              <AlertDialogDescription>
                Il apparaîtra dans votre flux comme un repost. Confirmez-vous le partage ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  handleConfirmShare()
                  setConfirmShareOpen(false)
                }}
              >
                Partager
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Ligne “J’aime” */}
      <div className="mt-2 text-sm font-medium">
        {likesCount} {`J'aime`}
      </div>
    </div>
  )
}
