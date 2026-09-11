'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, X, Pencil, Heart } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetchWithAuth'
import { updateMentorProfile } from '@/lib/api/mentoring/profile'
import { startStripeOnboarding } from '@/lib/api/stripe'
import type { MentorProfile } from '@/types/mentoring'

interface TechGroup { id: number; name: string }

const TEACHING_STYLES = [
  { value: 'guided',        label: 'Guide sans donner les réponses' },
  { value: 'direct',        label: 'Explications directes et réponses' },
  { value: 'socratic',      label: 'Méthode socratique (questions)' },
  { value: 'collaborative', label: 'Travail collaboratif' },
]

const SUGGESTIONS_COUNT = 8

interface Props {
  profile: MentorProfile
  onSaved: (updated: MentorProfile) => void
}

export default function MentorProfileEditModal({ profile, onSaved }: Props) {
  const [open, setOpen] = useState(false)

  const [groups, setGroups]     = useState<TechGroup[]>([])
  const [groupsReady, setGroupsReady] = useState(false)

  const [selectedIds, setSelectedIds]       = useState<number[]>([])
  const [groupSearch, setGroupSearch]       = useState('')
  const [teachingStyle, setTeachingStyle]   = useState('')
  const [maxMentees, setMaxMentees]         = useState(3)
  const [bio, setBio]                       = useState('')
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [stripeRedirecting, setStripeRedirecting] = useState(false)

  // Charger les groupes au premier ouverture
  useEffect(() => {
    if (!open || groupsReady) return
    fetchWithAuth('/group')
      .then(r => r.json())
      .then((data: TechGroup[]) => { setGroups(data); setGroupsReady(true) })
      .catch(() => setGroupsReady(true))
  }, [open, groupsReady])

  // Pré-remplir depuis le profil courant
  useEffect(() => {
    if (!open) return
    setSelectedIds(profile.specialties.map(s => s.id))
    setTeachingStyle(profile.teachingStyle ?? '')
    setMaxMentees(profile.maxActiveMentees)
    setBio(profile.mentorBio ?? '')
    setError(null)
  }, [open, profile])

  const unselected = useMemo(
    () => groups.filter(g => !selectedIds.includes(g.id)),
    [groups, selectedIds]
  )

  const visible = useMemo(() => {
    const term = groupSearch.trim().toLowerCase()
    if (!term) return unselected.slice(0, SUGGESTIONS_COUNT)
    return unselected.filter(g => g.name.toLowerCase().includes(term))
  }, [unselected, groupSearch])

  const selectedGroups = useMemo(
    () => groups.filter(g => selectedIds.includes(g.id)),
    [groups, selectedIds]
  )

  const toggle = (id: number) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const handleStripe = async () => {
    setStripeRedirecting(true)
    setError(null)
    try {
      window.location.href = await startStripeOnboarding()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Impossible de contacter Stripe.')
      setStripeRedirecting(false)
    }
  }

  const stripe = profile.stripe
  const donationLabel = stripe?.transfersEnabled
    ? { text: 'Paiements actifs', cls: 'text-emerald-600 dark:text-emerald-400' }
    : stripe?.onboarded
      ? { text: 'Vérification Stripe en cours', cls: 'text-amber-600 dark:text-amber-400' }
      : { text: 'Non configuré — vous ne pouvez pas recevoir de dons', cls: 'text-muted-foreground' }

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      setError('Sélectionne au moins une spécialité.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const updated = await updateMentorProfile({
        specialties:      selectedIds,
        teachingStyle:    teachingStyle || undefined,
        maxActiveMentees: maxMentees,
        mentorBio:        bio || undefined,
      })
      onSaved(updated)
      setOpen(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5" />
        Modifier mon profil
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative z-10 w-full max-w-lg mx-4 bg-background border border-border rounded-xl shadow-xl flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold text-sm">Modifier mon profil mentor</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              <p className="text-xs text-muted-foreground">
                Les champs marqués d&apos;un <span className="text-destructive font-semibold">*</span> sont obligatoires.
              </p>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Présentation <span className="font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  rows={3}
                  placeholder="Décris ton expérience, ta façon d'accompagner…"
                  className="w-full text-sm rounded-lg border border-border bg-muted/30 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                />
              </div>

              {/* Style pédagogique */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Style pédagogique <span className="font-normal text-muted-foreground">(optionnel)</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TEACHING_STYLES.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setTeachingStyle(prev => prev === s.value ? '' : s.value)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                        teachingStyle === s.value
                          ? 'border-primary bg-primary/10 text-primary font-medium'
                          : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Capacité */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Mentorés actifs max <span className="text-destructive">*</span> — <span className="text-primary">{maxMentees}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={maxMentees}
                  onChange={e => setMaxMentees(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>1</span><span>5</span><span>10</span>
                </div>
              </div>

              {/* Spécialités */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">
                  Spécialités technologiques <span className="text-destructive">*</span>
                </label>

                {/* Tags sélectionnés */}
                {selectedGroups.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedGroups.map(g => (
                      <span
                        key={g.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium cursor-pointer hover:bg-primary/20 transition-colors"
                        onClick={() => toggle(g.id)}
                      >
                        {g.name}
                        <X className="h-3 w-3" />
                      </span>
                    ))}
                  </div>
                )}

                {/* Recherche */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={groupSearch}
                    onChange={e => setGroupSearch(e.target.value)}
                    placeholder="Rechercher un groupe…"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border bg-muted/30 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
                  />
                </div>

                {/* Suggestions */}
                {!groupsReady ? (
                  <p className="text-xs text-muted-foreground">Chargement…</p>
                ) : visible.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun groupe trouvé.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {visible.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggle(g.id)}
                        className="px-2 py-0.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                      >
                        + {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Recevoir des dons */}
              <div className="space-y-2 pt-1 border-t border-border">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5" /> Recevoir des dons
                </label>
                <p className={`text-xs ${donationLabel.cls}`}>{donationLabel.text}</p>
                <button
                  type="button"
                  onClick={handleStripe}
                  disabled={stripeRedirecting}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-md border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors disabled:opacity-50"
                >
                  {stripeRedirecting
                    ? 'Redirection…'
                    : stripe?.onboarded ? 'Gérer sur Stripe' : 'Configurer mes paiements'}
                </button>
                <p className="text-[10px] text-muted-foreground">
                  Vos coordonnées bancaires sont gérées par Stripe et ne sont jamais stockées sur WOC.
                </p>
              </div>

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border shrink-0">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {saving ? 'Sauvegarde…' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
