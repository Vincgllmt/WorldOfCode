'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useEffect } from 'react'

const groupSchema = z.object({
  name: z.string().min(2, 'Minimum 2 caractères').max(255),
  description: z.string().max(2000).optional(),
  rssFeedUrl: z.string().url('URL invalide').max(500).optional().or(z.literal('')),
})

type GroupFormValues = z.infer<typeof groupSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialValues?: Partial<GroupFormValues>
  onSubmit: (values: GroupFormValues) => Promise<void>
  isSubmitting?: boolean
}

export function GroupFormDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  onSubmit,
  isSubmitting,
}: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', description: '', rssFeedUrl: '' },
  })

  useEffect(() => {
    if (open) {
      reset(initialValues ?? { name: '', description: '', rssFeedUrl: '' })
    }
  }, [open, initialValues, reset])

  const title = mode === 'create' ? 'Nouveau groupe' : 'Modifier le groupe'

  const handleClose = () => {
    reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">
              Nom <span className="text-destructive">*</span>
            </Label>
            <Input id="name" placeholder="ex: React, Docker, AWS..." {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Description du groupe..."
              rows={3}
              {...register('description')}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rssFeedUrl">URL du flux RSS</Label>
            <Input
              id="rssFeedUrl"
              placeholder="https://example.com/feed.xml"
              {...register('rssFeedUrl')}
            />
            {errors.rssFeedUrl ? (
              <p className="text-xs text-destructive">{errors.rssFeedUrl.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optionnel — associe automatiquement une source de veille au groupe.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? 'Enregistrement...'
                : mode === 'create'
                  ? 'Créer le groupe'
                  : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
