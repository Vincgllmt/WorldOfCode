'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
  AlertDialogTitle,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog'
import { MoreHorizontal, Flag } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import PostActions from './PostActions'
import CommentSection from '../comment/commentSection'
import PostHeader from './PostHeader'
import PostContent from './PostContent'
import SharedPostCard from './SharedPostCard'
import type { Post } from '@/interfaces/post'
import { usePostItem } from '@/hooks/usePostItem'
import toast from 'react-hot-toast'

type PostItemProps = {
  readonly post: Post
  readonly defaultShowComments?: boolean
}

export default function PostItem({ post, defaultShowComments = false }: PostItemProps) {
  const sharedPost = post.sharedPost ?? null
  const isShare = sharedPost !== null
  const {
    author,
    authorLoading,
    group,
    groupLoading,
    isEditing,
    setIsEditing,
    showDialog,
    setShowDialog,
    showComments,
    editableRef,
    commentRef,
    currentUserId,
    isAuthor,
    sanitizedContent,
    handleSave,
    handleDelete,
    openCommentsAndFocus,
  } = usePostItem(post, defaultShowComments)

  return (
    <div className="bg-card rounded-xl shadow p-4 space-y-2 relative">
      {/* Dropdown menu auteur */}
      {isAuthor && !isEditing && (
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                ✏️ Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setShowDialog(true)}
                className="text-red-600"
              >
                🗑️ Supprimer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => toast('Signalement envoyé')}
                className="text-red-600"
              >
                <Flag className="mr-2 h-4 w-4" /> Signaler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Confirmation suppression */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce post ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le post sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDelete}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* --- Header auteur (avatar + username + Follow toggle) --- */}
      {authorLoading ? (
        <div className="flex items-center gap-2">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ) : author ? (
        <>
          <PostHeader
            currentUserId={currentUserId}
            authorId={post.authorId}
            authorUsername={author.username}
            authorAvatarUrl={post.authorAvatarUrl ?? null}
            isAuthorFollowedByMe={post.isAuthorFollowedByMe}
            className="mb-1"
          />
          {/* Badge du groupe sous le header */}
          <div>
            {groupLoading ? (
              <Skeleton className="h-4 w-24" />
            ) : group ? (
              <Badge variant="outline" className="text-xs">
                {group.name}
              </Badge>
            ) : null}
          </div>
        </>
      ) : null}

      {/* Contenu (éditable si auteur) */}
      {isEditing ? (
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          className={cn(
            'text-base p-3 rounded-lg border border-yellow-300 bg-yellow-50',
            'leading-relaxed focus:outline-none focus:ring-2 focus:ring-yellow-400'
          )}
          dangerouslySetInnerHTML={{ __html: sanitizedContent || '<p></p>' }}
        />
      ) : post.content ? (
        <PostContent content={post.content} />
      ) : isShare ? (
        <p className="text-sm text-slate-600"></p>
      ) : null}

      {sharedPost ? (
        <div className="mt-4">
          <SharedPostCard post={sharedPost} />
        </div>
      ) : null}

      {isAuthor && isEditing && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={handleSave}>
            💾 Enregistrer
          </Button>
        </div>
      )}

      {/* Barre d’actions (Like / Commenter / Partager) */}
      <PostActions
        post={post}
        className="pt-2"
        onCommentClick={openCommentsAndFocus}
        copyLinkOnShare
        postUrl={`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/post/${post.id}`}
      />

      {/* Commentaires */}
      {showComments && (
        <div className="rounded-xl shadow p-4 bg-background space-y-2">
          <CommentSection ref={commentRef} postId={post.id} />
        </div>
      )}
    </div>
  )
}
