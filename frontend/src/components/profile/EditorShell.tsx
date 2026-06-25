'use client'

import { useState } from 'react'
import { Check, Grip, Sparkles, Settings, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VisibilityToggle } from '@/components/profile/VisibilityToggle'
import ExperienceDndList from '@/components/profile/ExperienceDndList'
import TemplateSelector from '@/components/profile/TemplateSelector'
import CvPreview from '@/components/profile/CvPreview'
import { useReorderExperiences } from '@/hooks/useReorderExperiences'
import { useUpdateFieldVisibility } from '@/hooks/useUpdateFieldVisibility'
import { useSaveCvLayout } from '@/hooks/useSaveCvLayout'
import type { CvLayout, User, Visibility } from '@/interfaces/user'

type Tab = 'content' | 'templates' | 'layout'

type Props = {
  user: User
  userId: number
  onClose: () => void
}

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'content',   label: 'Contenu',     icon: <Grip className="h-3.5 w-3.5" /> },
  { id: 'templates', label: 'Modèles',     icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: 'layout',    label: 'Mise en page', icon: <Settings className="h-3.5 w-3.5" /> },
]

const SECTIONS = [
  { key: 'bio',          label: 'À propos',     icon: '👤' },
  { key: 'experiences',  label: 'Expériences',  icon: '💼' },
  { key: 'skills',       label: 'Compétences',  icon: '⚡' },
  { key: 'links',        label: 'Liens',        icon: '🔗' },
]

const ACCENT_COLORS = [
  { label: 'Vert WOC',  value: null,      hex: '#16a34a' },
  { label: 'Bleu',      value: '#2563eb', hex: '#2563eb' },
  { label: 'Violet',    value: '#7c3aed', hex: '#7c3aed' },
  { label: 'Ambre',     value: '#d97706', hex: '#d97706' },
  { label: 'Ardoise',   value: '#475569', hex: '#475569' },
]

export default function EditorShell({ user, userId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('content')
  const [previewLayout, setPreviewLayout] = useState<CvLayout>(user.cvLayout ?? 'sidebar-left')
  const [previewAccentColor, setPreviewAccentColor] = useState<string | null>(user.cvAccentColor ?? null)

  const { mutate: reorderExperiences } = useReorderExperiences(userId)
  const { mutate: updateFieldVisibility } = useUpdateFieldVisibility(userId)
  const { mutate: saveLayout, isPending: isSaving } = useSaveCvLayout(userId)

  function handleDone() {
    saveLayout(
      { cvLayout: previewLayout, cvAccentColor: previewAccentColor },
      { onSuccess: onClose, onError: onClose }
    )
  }

  const fv = user.fieldVisibility ?? {}

  return (
    <div className="flex flex-col gap-0 -mx-4 md:-mx-6">
      {/* Banner */}
      <div className="flex items-center gap-3 bg-accent border-b border-sidebar-border px-6 py-3">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <p className="flex-1 text-sm text-accent-foreground">
          Mode édition — glissez les blocs pour les réorganiser, choisissez un modèle ou ajustez la mise en page.
        </p>
        <Button size="sm" onClick={handleDone} disabled={isSaving} className="gap-1.5 shrink-0">
          <Check className="h-4 w-4" />
          {isSaving ? 'Enregistrement…' : 'Terminé'}
        </Button>
      </div>

      {/* Editor grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-5 px-6 py-5 items-start">
        {/* Left panel */}
        <div className="rounded-2xl border border-border/70 bg-card shadow-sm p-4 lg:sticky lg:top-[calc(var(--navbar-height)+1rem)]">
          {/* Tabs */}
          <div className="flex gap-1 bg-muted rounded-xl p-1 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Contenu */}
          {activeTab === 'content' && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">
                Cliquez sur la visibilité pour la changer. Glissez <strong>⠿</strong> pour réordonner les expériences.
              </p>
              {SECTIONS.map((section) => (
                <div
                  key={section.key}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5"
                >
                  <span className="text-base">{section.icon}</span>
                  <span className="flex-1 text-sm font-semibold">{section.label}</span>
                  {section.key !== 'experiences' && (
                    <VisibilityToggle
                      visibility={(fv[section.key] as Visibility) ?? 'PUBLIC'}
                      onChange={(v) => updateFieldVisibility({ [section.key]: v })}
                    />
                  )}
                </div>
              ))}

              {/* Experiences DnD inline */}
              {user.experiences && user.experiences.length > 0 && (
                <div className="mt-3 rounded-xl border border-border/70 bg-background p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                    Ordre des expériences
                  </p>
                  <ExperienceDndList
                    experiences={user.experiences}
                    userId={userId}
                    onReorder={(orderedIds) => reorderExperiences(orderedIds)}
                  />
                </div>
              )}
            </div>
          )}

          {/* Modèles */}
          {activeTab === 'templates' && (
            <TemplateSelector value={previewLayout} onChange={setPreviewLayout} />
          )}

          {/* Mise en page */}
          {activeTab === 'layout' && (
            <div className="space-y-5">
              {/* Position photo */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Position de la photo
                </p>
                <div className="flex gap-1 bg-muted rounded-xl p-1">
                  {(['sidebar-left', 'sidebar-right'] as const).map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setPreviewLayout(l)}
                      disabled={previewLayout === 'single-column'}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-40 ${
                        previewLayout === l
                          ? 'bg-card text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {l === 'sidebar-left' ? '← Gauche' : 'Droite →'}
                    </button>
                  ))}
                </div>
                {previewLayout === 'single-column' && (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Non applicable en une colonne.
                  </p>
                )}
              </div>

              {/* Couleur d'accent */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Couleur d'accent
                </p>
                <div className="flex gap-2.5">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.hex}
                      type="button"
                      title={color.label}
                      onClick={() => setPreviewAccentColor(color.value)}
                      className={`h-7 w-7 rounded-full border-2 border-card transition-all ${
                        previewAccentColor === color.value
                          ? 'ring-2 ring-offset-2 ring-foreground scale-110'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview */}
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            <LayoutGrid className="h-3.5 w-3.5" />
            Aperçu en direct
          </p>
          <CvPreview user={user} layout={previewLayout} accentColor={previewAccentColor} />
        </div>
      </div>
    </div>
  )
}
