'use client'

import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreatePost } from '@/hooks/usePosts'
import { useGroups } from '@/hooks/useGroups'
import type { PostFormValues } from '@/interfaces/post'

const stripHtml = (value: string): string => value.replace(/<[^>]*>/g, '')

const postFormSchema = z.object({
  content: z
    .string()
    .max(5000, 'Le contenu ne peut pas dépasser 5000 caractères')
    .refine(
      (value) => stripHtml(value).trim().length > 0,
      'Le contenu est requis'
    ),
  groupId: z.coerce.number().int().positive('Un groupe doit être sélectionné'),
})

export const usePostFormController = (
  presetGroupId: number | undefined,
  onSuccess?: () => void
) => {
  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postFormSchema),
    defaultValues: {
      content: '',
      groupId: presetGroupId,
    },
  })

  useEffect(() => {
    if (typeof presetGroupId === 'number') {
      setValue('groupId', presetGroupId)
    }
  }, [presetGroupId, setValue])

  const createPost = useCreatePost()
  const { groups, isLoading: loadingGroups } = useGroups()
  const isPending = createPost.isPending

  // Counter used as a React key to force-remount the Select on reset
  const [selectKey, setSelectKey] = useState(0)

  const onSubmit = (data: PostFormValues) => {
    createPost.mutate(data, {
      onSuccess: () => {
        reset({ content: '', groupId: presetGroupId })
        // Force-remount the Select so it shows the placeholder again
        if (presetGroupId == null) setSelectKey((k) => k + 1)
        onSuccess?.()
      },
    })
  }

  return {
    control,
    handleSubmit,
    errors,
    groups,
    loadingGroups,
    isPending,
    groupIdValue: watch('groupId'),
    setGroupId: (value: number) => setValue('groupId', value, { shouldValidate: true }),
    selectKey,
    onSubmit,
  }
}

export { Controller }
