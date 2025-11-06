import { z } from 'zod'

const passwordComplexity =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{12,}$/

export const userProfileSchema = z.object({
  firstname: z
    .string()
    .trim()
    .min(1, 'Le prénom est requis')
    .max(100, 'Le prénom est trop long'),
  lastname: z
    .string()
    .trim()
    .min(1, 'Le nom est requis')
    .max(100, 'Le nom est trop long'),
  email: z.string().trim().email('Adresse e-mail invalide'),
})

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z
      .string()
      .regex(
        passwordComplexity,
        'Le mot de passe doit contenir au moins 12 caractères avec une majuscule, une minuscule, un chiffre et un caractère spécial.'
      ),
    confirmPassword: z.string().min(1, 'La confirmation est requise'),
  })
  .refine(({ newPassword, confirmPassword }) => newPassword === confirmPassword, {
    message: 'La confirmation doit correspondre au nouveau mot de passe.',
    path: ['confirmPassword'],
  })

export type UserProfileFormValues = z.infer<typeof userProfileSchema>
export type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>
