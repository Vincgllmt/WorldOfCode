'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Lightbulb } from 'lucide-react'

import { postGroupSuggestion } from '@/services/groupSuggestionService'
import type { GroupSuggestionRequest } from '@/services/groupSuggestionService'

const groupSuggestionSchema = z.object({
  name: z
    .string()
    .min(2, { message: 'Le nom doit comporter au moins 2 caractères.' })
    .max(255, { message: 'Le nom ne peut pas dépasser 255 caractères.' }),
  description: z
    .string()
    .max(1000, { message: 'La description ne peut pas dépasser 1000 caractères.' })
    .optional(),
  rssFeedUrl: z
    .string()
    .url({ message: "L'URL du flux RSS est invalide." })
    .max(500, { message: "L'URL ne peut pas dépasser 500 caractères." })
    .optional()
    .or(z.literal('')),
})

type GroupSuggestionFormValues = z.infer<typeof groupSuggestionSchema>

export default function GroupSuggestionForm() {
  const [open, setOpen] = useState(false)

  const form = useForm<GroupSuggestionFormValues>({
    resolver: zodResolver(groupSuggestionSchema),
    defaultValues: {
      name: '',
      description: '',
      rssFeedUrl: '',
    },
  })

  const mutation = useMutation({
    mutationFn: (data: GroupSuggestionRequest) => postGroupSuggestion(data),
    onSuccess: () => {
      toast.success('Votre suggestion a été envoyée avec succès !')
      form.reset()
      setOpen(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erreur lors de la soumission de la suggestion.')
    },
  })

  const onSubmit = (values: GroupSuggestionFormValues) => {
    const payload: GroupSuggestionRequest = { name: values.name }
    if (values.description && values.description.trim() !== '') {
      payload.description = values.description
    }
    if (values.rssFeedUrl && values.rssFeedUrl.trim() !== '') {
      payload.rssFeedUrl = values.rssFeedUrl
    }
    mutation.mutate(payload)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen)
      if (!isOpen) form.reset()
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4" />
          Suggérer un groupe
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Suggérer un nouveau groupe</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Nom du groupe <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="ex: Rust Developers France" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez brièvement le groupe et son objectif..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rssFeedUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL du flux RSS</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/feed.xml"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Optionnel — si vous ne connaissez pas l&apos;URL, l&apos;admin pourra la rechercher.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset()
                  setOpen(false)
                }}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Envoi en cours…' : 'Envoyer la suggestion'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
