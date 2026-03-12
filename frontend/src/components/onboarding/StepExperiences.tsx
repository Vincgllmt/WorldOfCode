'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { experiencesSchema, type ExperiencesFormValues } from '@/interfaces/user.schemas'
import { useUpdateProfile } from '@/hooks/useOnboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import MonthYearPicker from './MonthYearPicker'
import toast from 'react-hot-toast'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import type { PublicUser } from '@/interfaces/user'

type Props = {
  onSuccess: () => void
  setIsSubmitting: (v: boolean) => void
  profile?: PublicUser
}

export default function StepExperiences({ onSuccess, setIsSubmitting, profile }: Props) {
  const existingExperiences = (profile?.experiences ?? []).map((exp) => ({
    title: exp.title ?? '',
    company: exp.company ?? '',
    startDate: exp.startDate ?? '',
    endDate: exp.endDate ?? null,
    description: exp.description ?? '',
  }))

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ExperiencesFormValues>({
    resolver: zodResolver(experiencesSchema),
    defaultValues: { experiences: existingExperiences },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'experiences',
  })

  const updateProfile = useUpdateProfile()

  const onSubmit = async (data: ExperiencesFormValues) => {
    if (data.experiences.length === 0) {
      onSuccess()
      return
    }

    setIsSubmitting(true)
    try {
      await updateProfile.mutateAsync({ experiences: data.experiences })
      toast.success('Expériences enregistrées')
      onSuccess()
    } finally {
      setIsSubmitting(false)
    }
  }

  const addExperience = () => {
    append({
      title: '',
      company: '',
      startDate: '',
      endDate: null,
      description: '',
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucune expérience ajoutée. Cliquez sur le bouton ci-dessous pour en ajouter une.
        </p>
      )}

      {fields.map((field, index) => {
        const endDateValue = watch(`experiences.${index}.endDate`)
        const isCurrentJob = endDateValue === null

        return (
          <Card key={field.id} className="relative">
            <CardContent className="pt-4 space-y-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Poste</Label>
                  <Input
                    placeholder="Développeur fullstack"
                    className="mt-1"
                    {...register(`experiences.${index}.title`)}
                  />
                  {errors.experiences?.[index]?.title && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.experiences[index].title?.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Entreprise</Label>
                  <Input
                    placeholder="Acme Corp"
                    className="mt-1"
                    {...register(`experiences.${index}.company`)}
                  />
                  {errors.experiences?.[index]?.company && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.experiences[index].company?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date de début</Label>
                  <MonthYearPicker
                    value={watch(`experiences.${index}.startDate`)}
                    onChange={(val) => setValue(`experiences.${index}.startDate`, val)}
                  />
                  {errors.experiences?.[index]?.startDate && (
                    <p className="text-sm text-red-500 mt-1">
                      {errors.experiences[index].startDate?.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <MonthYearPicker
                    value={isCurrentJob ? '' : (endDateValue || '')}
                    onChange={(val) => setValue(`experiences.${index}.endDate`, val)}
                    disabled={isCurrentJob}
                    placeholder={isCurrentJob ? 'Poste actuel' : 'Sélectionner une date'}
                  />
                  <label className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCurrentJob}
                      onChange={(e) => {
                        setValue(
                          `experiences.${index}.endDate`,
                          e.target.checked ? null : ''
                        )
                      }}
                      className="rounded"
                    />
                    Poste actuel
                  </label>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  placeholder="Décrivez vos missions..."
                  className="mt-1 resize-none"
                  rows={2}
                  {...register(`experiences.${index}.description`)}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}

      <Button
        type="button"
        variant="outline"
        onClick={addExperience}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter une expérience
      </Button>

      <Button type="submit" className="w-full gap-2" disabled={updateProfile.isPending}>
        {updateProfile.isPending ? 'Enregistrement...' : 'Enregistrer et continuer'}
        {!updateProfile.isPending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  )
}
