'use client'

import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useChangePassword } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'

const schema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: z.string().min(8, 'Le nouveau mot de passe doit contenir au moins 8 caractères'),
})

type FormValues = z.infer<typeof schema>

export default function UpdatePasswordForm() {
  const { user } = useAuth()
  const changePassword = useChangePassword()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = (values: FormValues) => {
    if (user?.id) {
      changePassword.mutate(
        { id: user.id, ...values },
        {
          onSuccess: () => reset(),
        }
      )
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <label className="block text-sm font-medium">Mot de passe actuel</label>
      <Input type="password" {...register('currentPassword')} />
      {errors.currentPassword && (
        <p className="text-sm text-red-500">{errors.currentPassword.message}</p>
      )}

      <label className="block text-sm font-medium">Nouveau mot de passe</label>
      <Input type="password" {...register('newPassword')} />
      {errors.newPassword && (
        <p className="text-sm text-red-500">{errors.newPassword.message}</p>
      )}

      <Button type="submit" disabled={isSubmitting}>
        Modifier mon mot de passe
      </Button>
    </form>
  )
}
