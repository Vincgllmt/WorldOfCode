'use client'

import { Post } from '@/interfaces/post'
import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUpdatePost, useDeletePost } from '@/hooks/usePosts'
import { useUser } from '@/hooks/useUsers'
import { useGroup } from '@/hooks/useGroups'
// import SharedPostPreview from './SharedPostPreview'
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
import toast from 'react-hot-toast'
import { Badge } from '../ui/badge'
import { Skeleton } from '../ui/skeleton'
import PostActions from './PostActions'
import CommentSection, { CommentSectionHandle } from '../comment/commentSection'

export default function PostItem({ post }: { post: Post }) {
  const { user } = useAuth()
  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()

  const { data: author } = useUser(post.authorId)
  const { data: group } = useGroup(post.techGroupId)

  const [isEditing, setIsEditing] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)

  const editableRef = useRef<HTMLDivElement>(null)
  const commentRef = useRef<CommentSectionHandle>(null)

  const isAuthor = post.authorId === user?.id

  const handleSave = () => {
    const content = editableRef.current?.innerText || ''
    if (!content.trim()) return

    updatePost.mutate(
      {
        id: post.id,
        data: { content, groupId: post.techGroupId },
      },
      {
        onSuccess: () => {
          toast.success('Post mis à jour ✅')
          setIsEditing(false)
        },
        onError: () => {
          toast.error('Erreur lors de la mise à jour ❌')
        },
      }
    )
  }

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        toast.success('Post supprimé 🗑️')
        setShowDialog(false)
      },
      onError: () => {
        toast.error('Erreur lors de la suppression ❌')
      },
    })
  }

  const openCommentsAndFocus = () => {
    setShowComments(true)
    queueMicrotask(() => commentRef.current?.focusComposer())
  }

  return (
    <div className="bg-green-50 rounded-xl shadow p-4 space-y-2 relative">
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
                onClick={() => toast('Signalement envoyé ✅')}
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
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleDelete}
            >
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Header auteur */}
      <div className="flex items-center gap-2">
        {author ? (
          <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm">
            {author.username.slice(0, 2).toUpperCase()}
          </div>
        ) : (
          <Skeleton className="w-10 h-10 rounded-full" />
        )}
        <div>
          {author ? (
            <p className="font-semibold">{author.username}</p>
          ) : (
            <Skeleton className="h-4 w-32 mb-1" />
          )}
          {group ? (
            <Badge variant="outline" className="text-xs">
              {group.name}
            </Badge>
          ) : (
            <Skeleton className="h-4 w-24" />
          )}
        </div>
      </div>

      {/* Contenu (éditable si auteur) */}
      <div
        ref={isEditing ? editableRef : null}
        contentEditable={isEditing}
        suppressContentEditableWarning
        className={cn(
          'text-base p-2',
          isEditing && 'border rounded border-yellow-300 bg-yellow-50'
        )}
      >
        {post.content}
      </div>

      {isAuthor && isEditing && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" onClick={handleSave}>
            💾 Enregistrer
          </Button>
        </div>
      )}

      {/* Preview du post d’origine si c’est un repost */}
      {/* {isRepost(post) && <SharedPostPreview post={post} />} */}

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
        <div className="rounded-xl shadow p-4 bg-white space-y-2">
          <CommentSection ref={commentRef} postId={post.id} />
        </div>
      )}
    </div>
  )
}
