// frontend/src/components/comment/commentSection.tsx
'use client'

import React, { forwardRef, useImperativeHandle } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  useComments,
  useCreateComment,
  useDeleteComment,
  useUpdateComment,
} from '@/hooks/useComments'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

const schema = z.object({
  content: z.string().min(1).max(200, 'Le commentaire ne peut pas dépasser 200 caractères'),
})
type FormData = z.infer<typeof schema>

export type CommentSectionHandle = { focusComposer: () => void }
interface CommentSectionProps { postId: number }

const CommentSection = forwardRef<CommentSectionHandle, CommentSectionProps>(
  ({ postId }, ref) => {
    const { comments } = useComments()
    const { user } = useAuth()
    const createComment = useCreateComment()
    const deleteComment = useDeleteComment()
    const updateComment = useUpdateComment()

    const {
      register,
      handleSubmit,
      reset,
      setFocus,
      formState: { errors },
    } = useForm<FormData>({ resolver: zodResolver(schema) })

    // Expose focus vers l’extérieur (PostItem)
    useImperativeHandle(ref, () => ({
      focusComposer: () => setFocus('content'),
    }))

    const onSubmit = (data: FormData) => {
      createComment.mutate({ content: data.content, postId })
      reset()
      setFocus('content')
    }

    const [editingCommentId, setEditingCommentId] = React.useState<number | null>(null)
    const [editedContent, setEditedContent] = React.useState<string>('')

    const handleEdit = (commentId: number, content: string) => {
      setEditingCommentId(commentId)
      setEditedContent(content)
    }

    const handleSaveEdit = (id: number) => {
      if (editedContent.trim().length === 0) return
      updateComment.mutate({ id, content: editedContent })
      setEditingCommentId(null)
      setEditedContent('')
    }

    const filteredComments = comments?.filter(c => c.postId === postId) || []

    return (
      <div>
        {/* Formulaire ajout */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex gap-2">
          <Input
            {...register('content')}
            placeholder="Ajouter un commentaire..."
          />
          <Button type="submit">Commenter</Button>
        </form>

        {/* Liste des commentaires */}
        <div className="space-y-4 mt-4">
          {filteredComments.map(comment => {
            const isAuthor = comment.authorId === user?.id
            const isEditing = editingCommentId === comment.id

            return (
              <div key={comment.id} className="relative bg-gray-100 rounded-lg p-3 shadow-sm">
                {isAuthor && (
                  <div className="absolute top-2 right-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(comment.id, comment.content)}>
                          ✏️ Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteComment.mutate(String(comment.id))}>
                          🗑️ Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {isEditing ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className={cn(
                      'border border-yellow-400 rounded bg-yellow-100 p-2 text-sm text-gray-800',
                      'outline-none'
                    )}
                    onInput={e => setEditedContent((e.target as HTMLDivElement).innerText)}
                  >
                    {editedContent}
                  </div>
                ) : (
                  <p className="text-sm text-gray-800">{comment.content}</p>
                )}

                <div className="mt-1 text-xs text-muted-foreground">
                  par <span className="font-medium">{comment.authorUsername}</span>
                </div>

                {isEditing && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleSaveEdit(comment.id)}>
                    💾 Enregistrer
                  </Button>
                )}
              </div>
            )
          })}

          {errors.content && (
            <p className="text-sm text-red-500">
              Le commentaire doit être compris entre 1 et 200 caractères.
            </p>
          )}
        </div>
      </div>
    )
  }
)
CommentSection.displayName = 'CommentSection'

export default CommentSection
