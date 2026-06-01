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
  const [editGroupId, setEditGroupId] = useState(post.techGroupId)
  const [editContent, setEditContent] = useState(post.content ?? '')
  const [showDialog, setShowDialog] = useState(false)
  const [showComments, setShowComments] = useState(defaultShowComments)

  const commentRef = useRef<{ focusComposer: () => void }>(null)

  const currentUserId = user?.id ?? 0
  const isAuthor = post.authorId === user?.id
  const sanitizedContent = useSanitizedContent(post.content ?? '')

  const startEditing = () => {
    setEditContent(post.content ?? '')
    setIsEditing(true)
  }

  const handleSave = () => {
    const cleanedHtml = sanitizeHtml(editContent)
    const plainText = stripHtml(cleanedHtml).trim()

    if (!plainText && !post.sharedPost) {
      toast.error('Le contenu ne peut pas être vide')
      return
    }

    updatePost.mutate(
      { id: post.id, data: { content: plainText ? cleanedHtml : null, groupId: editGroupId } },
      {
        onSuccess: () => {
          setIsEditing(false)
        },
        onError: () => toast.error('Erreur lors de la mise à jour'),
      }
    )
  }

  const handleDelete = () => {
    deletePost.mutate(post.id, {
      onSuccess: () => {
        setShowDialog(false)
      },
      onError: () => toast.error('Erreur lors de la suppression'),
    })
  }

  const openCommentsAndFocus = () => {
    setShowComments((prev) => {
      if (!prev) {
        queueMicrotask(() => commentRef.current?.focusComposer())
      }
      return !prev
    })
  }

  return {
    author,
    authorLoading,
    group,
    groupLoading,
    isEditing,
    setIsEditing,
    startEditing,
    editGroupId,
    setEditGroupId,
    editContent,
    setEditContent,
    showDialog,
    setShowDialog,
    showComments,
    setShowComments,
    commentRef,
    currentUserId,
    isAuthor,
    sanitizedContent,
    handleSave,
    handleDelete,
    openCommentsAndFocus,
  }
}
