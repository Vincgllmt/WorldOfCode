'use client'

import * as React from 'react'
import type { Post } from '@/interfaces/post'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Heart, MessageCircle, Send, Forward, MessageSquare } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import ShareToMessageDialog from './ShareToMessageDialog'

type PostActionsProps = {
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
  copyLinkOnShare = false,
  postUrl,
}: PostActionsProps) {
  const { likedByMe, likesCount, onToggle, isPending } = usePostLikeState(
    post.id,
    post.techGroupId
  )

  const share = useSharePost()
  const [confirmShareOpen, setConfirmShareOpen] = React.useState(false)
  const [shareComment, setShareComment] = React.useState('')
  const [shareToMessageOpen, setShareToMessageOpen] = React.useState(false)

  const handleConfirmShare = async () => {
    share.mutate(
      {
        postId: post.id,
        payload: { content: shareComment.trim() === '' ? null : shareComment.trim() },
      },
      {
        onSuccess: async () => {
          if (copyLinkOnShare && postUrl) {
            try {
              await navigator.clipboard.writeText(postUrl)
              toast.success('Lien du post copié')
            } catch {
              /* noop */
            }
          }
        },
        onSettled: () => setShareComment(''),
      }
    )
  }

  const commentsCount = post.commentsCount ?? 0

  return (
    <div className={cn('pt-2', className)}>
      {/* Boutons d'actions */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8 relative', likedByMe && 'text-red-500')}
          onClick={onToggle}
          aria-pressed={likedByMe}
          aria-label={likedByMe ? 'Retirer le like' : 'Liker le post'}
          disabled={isPending}
        >
          <motion.div
            whileTap={{ scale: 0.75 }}
            animate={likedByMe ? { scale: [1, 1.3, 0.9, 1.1, 1] } : { scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Heart className={cn('h-6 w-6', likedByMe && 'fill-current')} />
          </motion.div>
          <AnimatePresence>
            {likedByMe && (
              <motion.span
                className="absolute inset-0 rounded-full bg-red-500/20"
                initial={{ scale: 0, opacity: 1 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            )}
          </AnimatePresence>
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Partager le post"
              disabled={share.isPending}
            >
              <Send className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setConfirmShareOpen(true)}>
              <Forward className="h-4 w-4 mr-2" />
              Partager dans le flux
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShareToMessageOpen(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Envoyer en message
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <AlertDialog
          open={confirmShareOpen}
          onOpenChange={(open) => {
            setConfirmShareOpen(open)
            if (!open) setShareComment('')
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Partager ce post ?</AlertDialogTitle>
              <AlertDialogDescription>
                Ajoutez un commentaire (optionnel) et confirmez le partage dans votre flux.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="share-comment">Votre commentaire (optionnel)</Label>
              <Textarea
                id="share-comment"
                value={shareComment}
                onChange={(event) => setShareComment(event.target.value)}
                placeholder="Ajouter un contexte ou un avis..."
                disabled={share.isPending}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  handleConfirmShare()
                  setConfirmShareOpen(false)
                }}
                disabled={share.isPending}
              >
                Partager
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <ShareToMessageDialog
          post={post}
          open={shareToMessageOpen}
          onOpenChange={setShareToMessageOpen}
        />
      </div>

      {/* Compteurs */}
      <Counters
        likesCount={likesCount}
        commentsCount={commentsCount}
        onCommentClick={onCommentClick}
      />
    </div>
  )
}

function Counters({
  likesCount,
  commentsCount,
  onCommentClick,
}: {
  likesCount: number
  commentsCount: number
  onCommentClick?: () => void
}) {
  if (likesCount === 0 && commentsCount === 0) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Soyez le premier à réagir
      </p>
    )
  }

  return (
    <div className="mt-2 flex items-center gap-4 text-sm">
      {likesCount > 0 && (
        <span className="font-medium">
          {likesCount} J&apos;aime
        </span>
      )}
      {commentsCount > 0 && (
        <button
          type="button"
          onClick={onCommentClick}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          {commentsCount} commentaire{commentsCount > 1 ? 's' : ''}
        </button>
      )}
    </div>
  )
}
