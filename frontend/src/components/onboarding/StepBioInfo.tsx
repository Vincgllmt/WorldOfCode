'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { bioInfoSchema, type BioInfoFormValues } from '@/interfaces/user.schemas'
import { useUpdateProfile } from '@/hooks/useOnboarding'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import CityPicker from './CityPicker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from 'react-hot-toast'
import { ArrowRight } from 'lucide-react'
import { AVAILABILITY_OPTIONS } from '@/lib/profile-constants'

type Props = {
  onSuccess: () => void
  setIsSubmitting: (v: boolean) => void
}

export default function StepBioInfo({ onSuccess, setIsSubmitting }: Props) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BioInfoFormValues>({
    resolver: zodResolver(bioInfoSchema),
    defaultValues: { bio: '', location: '', availability: '' },
  })

  const updateProfile = useUpdateProfile()
  const availabilityValue = watch('availability')
  const locationValue = watch('location')

  const onSubmit = async (data: BioInfoFormValues) => {
    setIsSubmitting(true)
    try {
      await updateProfile.mutateAsync({
        bio: data.bio || null,
        location: data.location || null,
        availability: data.availability || null,
      })
      toast.success('Profil mis à jour')
      onSuccess()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
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
        <Label>Localisation</Label>
        <CityPicker
          value={locationValue || ''}
          onChange={(city) => setValue('location', city)}
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

      <Button type="submit" className="w-full gap-2" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer et continuer'}
        {!updateProfile.isPending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  )
}
