'use client'

import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'

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
    const editTextareaRef = useRef<HTMLTextAreaElement | null>(null)

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

    useEffect(() => {
      if (editingCommentId !== null && editTextareaRef.current) {
        editTextareaRef.current.focus()
        const length = editTextareaRef.current.value.length
        editTextareaRef.current.setSelectionRange(length, length)
      }
    }, [editingCommentId])

    const filteredComments =
      comments
        ?.filter((c) => c.postId === postId)
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ) ?? []

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
          <AnimatePresence initial>
          {filteredComments.map((comment, index) => {
            const isAuthor = comment.authorId === user?.id
            const isEditing = editingCommentId === comment.id

            return (
              <motion.div
                key={comment.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                transition={{ delay: index * 0.06, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="relative bg-muted rounded-lg p-3 shadow-sm"
              >
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
                  <Textarea
                    ref={editTextareaRef}
                    value={editedContent}
                    onChange={(event) => setEditedContent(event.target.value)}
                    className={cn(
                      'border border-yellow-400 bg-yellow-100 text-sm text-foreground'
                    )}
                    maxLength={200}
                  />
                ) : (
                  <p className="text-sm text-foreground">{comment.content}</p>
                )}

                <div className="mt-1 text-xs text-muted-foreground">
                  par <span className="font-medium">{comment.authorUsername}</span>
                </div>

                {isEditing && (
                  <Button variant="ghost" size="sm" className="mt-2" onClick={() => handleSaveEdit(comment.id)}>
                    💾 Enregistrer
                  </Button>
                )}
              </motion.div>
            )
          })}
          </AnimatePresence>

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
