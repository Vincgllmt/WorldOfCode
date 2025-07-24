'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreatePost } from '@/hooks/usePosts'
import toast from 'react-hot-toast'
import { Label } from '@/components/ui/label'

const schema = z.object({
  content: z
    .string()
    .min(1, 'Le contenu est requis')
    .max(500, 'Le contenu ne peut pas dépasser 500 caractères'),
})

type FormData = z.infer<typeof schema>

export default function PostFormByGroup({ groupId }: { groupId: number }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const createPost = useCreatePost()

  const onSubmit = (data: FormData) => {
    createPost.mutate(
      { content: data.content, groupId },
      {
        onSuccess: () => {
          toast.success('Post publié dans ce groupe 🎉')
          reset()
        },
        onError: () => {
          toast.error('Erreur lors de la publication ❌')
        },
      }
    )
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="bg-muted p-6 rounded-xl shadow-sm space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="content">Contenu</Label>
        <Input
          id="content"
          placeholder="Exprimez-vous…"
          {...register('content')}
        />
        {errors.content && (
          <p className="text-sm text-red-500">{errors.content.message}</p>
        )}
      </div>

      <Button type="submit" disabled={createPost.isPending} className="w-full sm:w-auto">
        {createPost.isPending ? 'Publication...' : 'Publier'}
      </Button>
    </form>
  )
}
