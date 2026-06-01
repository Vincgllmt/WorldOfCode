'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReportPost } from '@/hooks/useReport'
import { Flag } from 'lucide-react'

type ReportPostDialogProps = {
  postId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam ou publicité indésirable' },
  { value: 'inappropriate', label: 'Contenu inapproprié ou offensant' },
  { value: 'harassment', label: 'Harcèlement ou intimidation' },
  { value: 'misinformation', label: 'Désinformation' },
  { value: 'illegal', label: 'Contenu illégal' },
  { value: 'hate_speech', label: 'Discours haineux' },
  { value: 'other', label: 'Autre' },
]

export default function ReportPostDialog({ postId, open, onOpenChange }: ReportPostDialogProps) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const { mutate, isPending } = useReportPost()

  const handleSubmit = () => {
    if (!reason) {
      toast.error('Veuillez sélectionner un motif')
      return
    }

    const reasonLabel = REPORT_REASONS.find((r) => r.value === reason)?.label || reason
    const fullReason = details.trim() ? `${reasonLabel} — ${details.trim()}` : reasonLabel

    mutate(
      { postId, reason: fullReason },
      {
        onSuccess: () => {
          toast.success('Signalement envoyé. Merci de contribuer à la modération.')
          setReason('')
          setDetails('')
          onOpenChange(false)
        },
        onError: (err) => {
          toast.error(err.message)
        },
      }
    )
  }

  const handleClose = () => {
    if (!isPending) {
      setReason('')
      setDetails('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Signaler cette publication
          </DialogTitle>
          <DialogDescription>
            Votre signalement sera examiné par l&apos;équipe de modération. Il reste anonyme pour l&apos;auteur de la publication.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Motif du signalement <span className="text-destructive">*</span>
            </label>
            <Select value={reason} onValueChange={setReason} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Choisissez un motif" />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Détails (optionnel)</label>
            <Textarea
              placeholder="Apportez des précisions si besoin..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              disabled={isPending}
              className="min-h-20 resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {details.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={isPending || !reason}
          >
            {isPending ? 'Envoi...' : 'Envoyer le signalement'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
