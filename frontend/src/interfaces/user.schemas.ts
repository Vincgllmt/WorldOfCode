import { z } from 'zod'

const passwordComplexity =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[ !"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]).{12,}$/

export const userProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Le nom d’utilisateur doit contenir au moins 3 caractères')
    .max(255, 'Le nom d’utilisateur est trop long'),
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

// --- Onboarding Step 1: Bio & Infos ---
export const bioInfoSchema = z.object({
  bio: z.string().max(1000, 'La bio ne doit pas dépasser 1000 caractères').optional().or(z.literal('')),
  location: z.string().max(150, 'La localisation ne doit pas dépasser 150 caractères').optional().or(z.literal('')),
  availability: z.enum(['open_to_work', 'employed', 'freelance', 'student', '']).optional(),
})
export type BioInfoFormValues = z.infer<typeof bioInfoSchema>

// --- Onboarding Step 2: Expériences ---
export const experienceItemSchema = z.object({
  title: z.string().min(1, 'Le poste est requis'),
  company: z.string().min(1, "L'entreprise est requise"),
  startDate: z.string().min(1, 'La date de début est requise'),
  endDate: z.string().nullable().optional(),
  description: z.string().optional().or(z.literal('')),
})

export const experiencesSchema = z.object({
  experiences: z.array(experienceItemSchema),
})
export type ExperiencesFormValues = z.infer<typeof experiencesSchema>

// --- Onboarding Step 3: Skills ---
export const skillsSchema = z.object({
  skillIds: z.array(z.number()),
})
export type SkillsFormValues = z.infer<typeof skillsSchema>

// --- Onboarding Step 4: Liens ---
export const linkItemSchema = z.object({
  id: z.number().optional(),
  type: z.enum(['github', 'gitlab', 'linkedin', 'portfolio', 'other']),
  url: z.string().url('URL invalide'),
})

export const linksSchema = z.object({
  links: z.array(linkItemSchema),
})
export type LinksFormValues = z.infer<typeof linksSchema>

// --- Onboarding Step 5: Groupes ---
export const groupsSchema = z.object({
  groupIds: z.array(z.number()),
})
export type GroupsFormValues = z.infer<typeof groupsSchema>
