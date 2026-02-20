'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bioInfoSchema, type BioInfoFormValues } from '@/interfaces/user.schemas'
import { useUpdateProfile } from '@/hooks/useOnboarding'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AVAILABILITY_OPTIONS } from '@/lib/profile-constants'
import toast from 'react-hot-toast'
import type { PublicUser } from '@/interfaces/user'

type EditBioDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: PublicUser
}

export default function EditBioDialog({ open, onOpenChange, user }: EditBioDialogProps) {
  const { user: authUser } = useAuth()
  const queryClient = useQueryClient()
  const updateProfile = useUpdateProfile()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BioInfoFormValues>({
    resolver: zodResolver(bioInfoSchema),
    defaultValues: {
      bio: user.bio ?? '',
      location: user.location ?? '',
      availability: (user.availability as BioInfoFormValues['availability']) ?? '',
    },
  })

  const availabilityValue = watch('availability')

  const onSubmit = async (data: BioInfoFormValues) => {
    await updateProfile.mutateAsync({
      bio: data.bio || null,
      location: data.location || null,
      availability: data.availability || null,
    })
    await queryClient.invalidateQueries({ queryKey: ['user', authUser?.id] })
    toast.success('Profil mis à jour')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription>
            Modifiez votre bio, localisation et disponibilité.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              placeholder="Présentez-vous en quelques mots..."
              className="mt-1 resize-none"
              rows={4}
              {...register('bio')}
            />
            {errors.bio && (
              <p className="text-sm text-red-500 mt-1">{errors.bio.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="edit-location">Localisation</Label>
            <input
              id="edit-location"
              type="text"
              placeholder="Paris, Lyon, Remote..."
              className="mt-1 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register('location')}
            />
            {errors.location && (
              <p className="text-sm text-red-500 mt-1">{errors.location.message}</p>
            )}
          </div>

          <div>
            <Label>Disponibilité</Label>
            <Select
              value={availabilityValue || ''}
              onValueChange={(value) => setValue('availability', value as BioInfoFormValues['availability'])}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Sélectionnez votre statut" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABILITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
