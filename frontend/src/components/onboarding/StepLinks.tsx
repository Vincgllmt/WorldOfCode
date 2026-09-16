'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { linksSchema, type LinksFormValues } from '@/interfaces/user.schemas'
import { useSyncLinks } from '@/hooks/useOnboarding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import toast from 'react-hot-toast'
import { ArrowRight, Plus, Trash2 } from 'lucide-react'
import type { LinkType, PublicUser } from '@/interfaces/user'
import { LINK_CONFIG } from '@/lib/profile-constants'

type Props = {
  onSuccess: () => void
  setIsSubmitting: (v: boolean) => void
  profile?: PublicUser
}

export default function StepLinks({ onSuccess, setIsSubmitting, profile }: Props) {
  const existingLinks = (profile?.links ?? []).map((link) => ({
    id: link.id,
    type: link.type as LinkType,
    url: link.url,
  }))

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LinksFormValues>({
    resolver: zodResolver(linksSchema),
    defaultValues: { links: existingLinks },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'links',
  })

  const { syncLinks, isPending } = useSyncLinks()

  const onSubmit = async (data: LinksFormValues) => {
    if (data.links.length === 0 && existingLinks.length === 0) {
      onSuccess()
      return
    }

    setIsSubmitting(true)
    try {
      await syncLinks(profile?.links ?? [], data.links)
      toast.success('Liens enregistrés')
      onSuccess()
    } finally {
      setIsSubmitting(false)
    }
  }

  const addLink = () => {
    append({ type: 'github', url: '' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Aucun lien ajouté. Ajoutez vos profils en ligne pour vous faire connaitre.
        </p>
      )}

      {fields.map((field, index) => {
        const typeValue = watch(`links.${index}.type`) as LinkType
        const config = LINK_CONFIG[typeValue] || LINK_CONFIG.other
        const Icon = config.icon

        return (
          <div key={field.id} className="flex items-start gap-2">
            <div className="w-36 shrink-0">
              <Select
                value={typeValue}
                onValueChange={(value) =>
                  setValue(`links.${index}.type`, value as LinkType)
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LINK_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        <cfg.icon className="h-3 w-3" />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1">
              <Input
                placeholder={config.placeholder}
                {...register(`links.${index}.url`)}
              />
              {errors.links?.[index]?.url && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.links[index].url?.message}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => remove(index)}
              className="text-muted-foreground hover:text-red-500 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      })}

      <Button
        type="button"
        variant="outline"
        onClick={addLink}
        className="w-full gap-2"
      >
        <Plus className="h-4 w-4" />
        Ajouter un lien
      </Button>

      <Button type="submit" className="w-full gap-2" disabled={isPending}>
        {isPending ? 'Enregistrement...' : 'Enregistrer et continuer'}
        {!isPending && <ArrowRight className="h-4 w-4" />}
      </Button>
    </form>
  )
}
