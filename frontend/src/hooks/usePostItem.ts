'use client'

import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAuth } from '@/hooks/useAuth'
import { useUpdatePost, useDeletePost } from '@/hooks/usePosts'
import { useUser } from '@/hooks/useUsers'
import { useGroup } from '@/hooks/useGroups'
import { useSanitizedContent } from './useSanitizedContent'
import type { Post } from '@/interfaces/post'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '')

export const usePostItem = (post: Post, defaultShowComments: boolean) => {
  const { user } = useAuth()
  const updatePost = useUpdatePost()
  const deletePost = useDeletePost()

  const { data: author, isLoading: authorLoading } = useUser(post.authorId)
  const { data: group, isLoading: groupLoading } = useGroup(post.techGroupId)

  const [isEditing, setIsEditing] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showComments, setShowComments] = useState(defaultShowComments)

  const editableRef = useRef<HTMLDivElement>(null)
  const commentRef = useRef<{ focusComposer: () => void }>(null)

  const currentUserId = user?.id ?? 0
  const isAuthor = post.authorId === user?.id
  const sanitizedContent = useSanitizedContent(post.content ?? '')

  const handleSave = () => {
    const rawHtml = editableRef.current?.innerHTML ?? ''
    const cleanedHtml = sanitizeHtml(rawHtml)

    if (!stripHtml(cleanedHtml).trim()) {
      toast.error('Le contenu ne peut pas être vide')
      return
    }

    updatePost.mutate(
      { id: post.id, data: { content: cleanedHtml, groupId: post.techGroupId } },
      {
        onSuccess: () => {
          toast.success('Post mis à jour ✅')
          setIsEditing(false)
        },
        onError: () => toast.error('Erreur lors de la mise à jour ❌'),
      }
    )
  }

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        toast.success('Post supprimé 🗑️')
        setShowDialog(false)
      },
      onError: () => toast.error('Erreur lors de la suppression ❌'),
    })
  }

  const openCommentsAndFocus = () => {
    setShowComments(true)
    queueMicrotask(() => commentRef.current?.focusComposer())
  }

  return {
    author,
    authorLoading,
    group,
    groupLoading,
    isEditing,
    setIsEditing,
    showDialog,
    setShowDialog,
    showComments,
    setShowComments,
    editableRef,
    commentRef,
    currentUserId,
    isAuthor,
    sanitizedContent,
    handleSave,
    handleDelete,
    openCommentsAndFocus,
  }
}
