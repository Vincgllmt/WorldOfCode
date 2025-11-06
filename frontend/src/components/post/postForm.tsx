'use client'
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

const schema = z.object({
  content: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(500, 'Le contenu ne peut pas dépasser 500 caractères'),
  groupId: z.coerce.number().int().positive('Un groupe doit être sélectionné'),
})

type FormData = z.infer<typeof schema>

export default function PostForm() {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const createPost = useCreatePost()
  const { groups, isLoading: loadingGroups } = useGroups()
  const isPending = createPost.isPending

  const onSubmit = (data: FormData) => {
    createPost.mutate(data, {
      onSuccess: () => {
        toast.success('Post publié avec succès 🎉')
        reset()
      },
    })
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-muted p-6 rounded-xl shadow-sm space-y-4"
    >
      <Input
        {...register('content')}
        placeholder="Exprimez-vous…"
      />
      {errors.content && (
        <p className="text-sm text-red-500">{errors.content.message}</p>
      )}

      <Select onValueChange={value => setValue('groupId', Number(value))}>
        <SelectTrigger>
          <SelectValue placeholder="Choisissez un groupe" />
        </SelectTrigger>
        <SelectContent>
          {loadingGroups ? (
            <p className="px-4 py-2 text-sm text-muted-foreground">Chargement...</p>
          ) : (
            groups?.map(group => (
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

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Publication...' : 'Publier'}
      </Button>
    </form>
  )
}
