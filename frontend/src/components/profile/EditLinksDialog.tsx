'use client'

import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { linksSchema, type LinksFormValues } from '@/interfaces/user.schemas'
import { useCreateLink } from '@/hooks/useOnboarding'
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
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LINK_CONFIG } from '@/lib/profile-constants'
import toast from 'react-hot-toast'
import { Plus, Trash2 } from 'lucide-react'
import type { LinkType, PublicUser } from '@/interfaces/user'

type EditLinksDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: PublicUser
}

export default function EditLinksDialog({ open, onOpenChange, user }: EditLinksDialogProps) {
  const { user: authUser } = useAuth()
  const queryClient = useQueryClient()
  const createLink = useCreateLink()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LinksFormValues>({
    resolver: zodResolver(linksSchema),
    defaultValues: {
      links: user.links?.map((link) => ({
        type: link.type,
        url: link.url,
      })) ?? [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'links',
  })

  const onSubmit = async (data: LinksFormValues) => {
    for (const link of data.links) {
      await createLink.mutateAsync({ type: link.type, url: link.url })
    }
    await queryClient.invalidateQueries({ queryKey: ['user', authUser?.id] })
    toast.success('Liens mis à jour')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier les liens</DialogTitle>
          <DialogDescription>
            Ajoutez vos profils GitHub, LinkedIn et autres.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun lien. Ajoutez vos profils en ligne.
            </p>
          )}

          {fields.map((field, index) => {
            const typeValue = watch(`links.${index}.type`) as LinkType
            const config = LINK_CONFIG[typeValue] || LINK_CONFIG.other

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
            onClick={() => append({ type: 'github', url: '' })}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Ajouter un lien
          </Button>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={createLink.isPending}>
              {createLink.isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
