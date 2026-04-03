'use client'

import { useState, useRef, useCallback } from 'react'
import { Send, ArrowLeft, CheckCircle2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSubmitFeedback, useHasExistingFeedback } from '@/hooks/useFeedback'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import Link from 'next/link'
import type { FeedbackPayload } from '@/interfaces/feedback'

interface RatingFieldProps {
  label: string
  value: number
  onChange: (val: number) => void
  max?: number
  required?: boolean
}

const ratingLabels: Record<number, string> = {
  0: '',
  1: 'Mauvais',
  2: 'Moyen',
  3: 'Correct',
  4: 'Bien',
  5: 'Excellent',
}

function RatingField({ label, value, onChange, max = 5, required = false }: RatingFieldProps) {
  const trackRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const step = Math.min(max, Math.max(1, Math.ceil(pct * max)))
    onChange(step)
  }, [max, onChange])

  const pct = value > 0 ? (value / max) * 100 : 0

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
        {value > 0 && (
          <span className="text-xs font-mono font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            {value}/{max} — {ratingLabels[value]}
          </span>
        )}
      </div>

      <div
        ref={trackRef}
        onClick={handleClick}
        className="relative h-3 rounded-full bg-muted/60 cursor-pointer group"
      >
        {/* Barre de progression */}
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-primary transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />

        {/* Segments */}
        <div className="absolute inset-0 flex">
          {Array.from({ length: max }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(i + 1) }}
              className="flex-1 relative"
            >
              {i > 0 && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-px h-2 bg-background/50" />
              )}
            </button>
          ))}
        </div>

        {/* Curseur */}
        {value > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary border-2 border-background shadow-md transition-all duration-300 ease-out group-hover:scale-110"
            style={{ left: `calc(${pct}% - 10px)` }}
          />
        )}
      </div>

      {/* Labels min/max */}
      <div className="flex justify-between text-[10px] text-muted-foreground/60 font-mono">
        <span>1</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

function NpsField({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        Recommanderiez-vous WOC ?
        <span className="text-destructive ml-1">*</span>
      </label>
      <p className="text-xs text-muted-foreground">1 = Pas du tout, 10 = Absolument</p>
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={cn(
              'h-9 w-9 rounded-lg text-sm font-medium transition-all',
              value === n
                ? 'bg-primary text-primary-foreground shadow-sm scale-110'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FeedbackForm() {
  const [overallSatisfaction, setOverallSatisfaction] = useState(0)
  const [easeOfUse, setEaseOfUse] = useState(0)
  const [contentQuality, setContentQuality] = useState(0)
  const [messagingRating, setMessagingRating] = useState(0)
  const [groupsRating, setGroupsRating] = useState(0)
  const [mentoringRating, setMentoringRating] = useState(0)
  const [npsScore, setNpsScore] = useState(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { mutate, isPending } = useSubmitFeedback()
  const { data: existingData } = useHasExistingFeedback()
  const hasExisting = existingData?.hasExisting ?? false

  const canSubmit = overallSatisfaction > 0 && easeOfUse > 0 && contentQuality > 0 && npsScore > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FeedbackPayload = {
      overallSatisfaction,
      easeOfUse,
      contentQuality,
      messagingRating: messagingRating > 0 ? messagingRating : null,
      groupsRating: groupsRating > 0 ? groupsRating : null,
      mentoringRating: mentoringRating > 0 ? mentoringRating : null,
      npsScore,
      comment: comment.trim() || null,
    }

    mutate(payload, {
      onSuccess: () => {
        setSubmitted(true)
      },
      onError: (err) => {
        toast.error(err.message)
      },
    })
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-10 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Merci pour votre retour !</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Votre avis est précieux et nous aide à construire une meilleure expérience pour toute la communauté.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3 pt-2">
          <Link href="/home" className="w-full max-w-[240px]">
            <Button className="w-full rounded-xl" size="lg">
              <ArrowLeft className="h-4 w-4" />
              Retour au fil
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {hasExisting && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-500/30 p-4">
          <Info className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Vous avez déjà donné votre avis. Vous pouvez en soumettre un nouveau, seul votre dernier avis sera pris en compte.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Votre avis compte</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Aidez-nous à améliorer WOC en partageant votre expérience.
          </p>
        </div>

        <div className="space-y-5">
          <RatingField
            label="Satisfaction globale"
            value={overallSatisfaction}
            onChange={setOverallSatisfaction}
            required
          />

          <RatingField
            label="Facilité d'utilisation"
            value={easeOfUse}
            onChange={setEaseOfUse}
            required
          />

          <RatingField
            label="Qualité du contenu"
            value={contentQuality}
            onChange={setContentQuality}
            required
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6">
        <div>
          <h3 className="text-base font-semibold">Fonctionnalités spécifiques</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Optionnel — notez uniquement les fonctionnalités que vous avez utilisées.
          </p>
        </div>

        <div className="space-y-5">
          <RatingField
            label="Messagerie"
            value={messagingRating}
            onChange={setMessagingRating}
          />

          <RatingField
            label="Système de groupes"
            value={groupsRating}
            onChange={setGroupsRating}
          />

          <RatingField
            label="Système de mentorat"
            value={mentoringRating}
            onChange={setMentoringRating}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card p-6 space-y-6">
        <NpsField value={npsScore} onChange={setNpsScore} />

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            Commentaire libre
          </label>
          <Textarea
            placeholder="Partagez vos suggestions, remarques ou idées d'amélioration..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-24 resize-none"
          />
        </div>
      </div>

      <Button
        type="submit"
        disabled={!canSubmit || isPending}
        className="w-full rounded-xl"
        size="lg"
      >
        <Send className="h-4 w-4" />
        {isPending ? 'Envoi en cours...' : 'Envoyer mon avis'}
      </Button>
    </form>
  )
}
