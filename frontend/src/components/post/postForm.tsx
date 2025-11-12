'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { useCreatePost } from '@/hooks/usePosts'
import { useGroups } from '@/hooks/useGroups'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

const schema = z.object({
  content: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(500, 'Le contenu ne peut pas dépasser 500 caractères'),
  groupId: z.coerce.number().int().positive('Un groupe doit être sélectionné'),
})

type FormData = z.infer<typeof schema>

type PostFormProps = {
  presetGroupId?: number
  showGroupSelector?: boolean
  className?: string
  onSuccess?: () => void
  submitLabel?: string
}

export default function PostForm({
  presetGroupId,
  showGroupSelector,
  className,
  onSuccess,
  submitLabel = 'Publier',
}: PostFormProps = {}) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
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

  const displaySelector =
    showGroupSelector ?? typeof presetGroupId === 'undefined'

  const onSubmit = (data: FormData) => {
    createPost.mutate(data, {
      onSuccess: () => {
        toast.success('Post publié avec succès 🎉')
        reset({ content: '', groupId: presetGroupId })
        onSuccess?.()
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('space-y-4 rounded-xl bg-muted p-6 shadow-sm', className)}
    >
      <Input {...register('content')} placeholder="Exprimez-vous…" />
      {errors.content && (
        <p className="text-sm text-red-500">{errors.content.message}</p>
      )}

      {displaySelector ? (
        <>
          <Select onValueChange={(value) => setValue('groupId', Number(value))}>
            <SelectTrigger>
              <SelectValue placeholder="Choisissez un groupe" />
            </SelectTrigger>
            <SelectContent>
              {loadingGroups ? (
                <p className="px-4 py-2 text-sm text-muted-foreground">
                  Chargement...
                </p>
              ) : (
                groups?.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {errors.groupId && (
            <p className="text-sm text-red-500">{errors.groupId.message}</p>
          )}
        </>
      ) : null}

      <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
        {isPending ? 'Publication...' : submitLabel}
      </Button>
    </form>
  )
}
