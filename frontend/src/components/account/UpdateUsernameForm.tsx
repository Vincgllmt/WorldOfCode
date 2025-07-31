// 'use client'

// import { useForm } from 'react-hook-form'
// import { z } from 'zod'
// import { zodResolver } from '@hookform/resolvers/zod'
// import { Input } from '@/components/ui/input'
// import { Button } from '@/components/ui/button'
// import { useUpdateUser } from '@/hooks/useUsers'
// import { useAuth } from '@/hooks/useAuth'

// const schema = z.object({
//   username: z.string().min(3, 'Le nom doit faire au moins 3 caractères'),
// })

// type FormValues = z.infer<typeof schema>

// export default function UpdateUsernameForm() {
//   const { user } = useAuth()
//   const updateUser = useUpdateUser()

//   const {
//     register,
//     handleSubmit,
//     formState: { errors, isSubmitting },
//   } = useForm<FormValues>({
//     resolver: zodResolver(schema),
//     defaultValues: {
//       username: user?.username || '',
//     },
//   })

//   const onSubmit = (values: FormValues) => {
//     if (user?.id) {
//       updateUser.mutate({
//         id: user.id,
//         username: values.username,
//         role: user.role,
//       })
//     }
//   }

//   return (
//     <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
//       <label className="block text-sm font-medium">Nom d’utilisateur</label>
//       <Input {...register('username')} />
//       {errors.username && (
//         <p className="text-sm text-red-500">{errors.username.message}</p>
//       )}
//       <Button type="submit" disabled={isSubmitting}>
//         Mettre à jour le nom
//       </Button>
//     </form>
//   )
// }
