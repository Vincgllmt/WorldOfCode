import type { CvLayout } from '@/interfaces/user'

type Props = {
  value: CvLayout
  onChange: (layout: CvLayout) => void
}

const TEMPLATES: { layout: CvLayout; label: string; thumb: React.ReactNode }[] = [
  {
    layout: 'sidebar-left',
    label: 'Classique',
    thumb: (
      <div className="relative h-20 w-full rounded-lg bg-muted overflow-hidden">
        <div className="absolute inset-y-0 left-0 w-[30%] bg-primary/20" />
        <div className="absolute top-3 left-[7%] h-4 w-4 rounded-full bg-primary" />
        <div
          className="absolute top-3 bottom-2.5 left-[36%] right-2"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 3px, transparent 3px, transparent 10px)' }}
        />
      </div>
    ),
  },
  {
    layout: 'sidebar-right',
    label: 'Sidebar à droite',
    thumb: (
      <div className="relative h-20 w-full rounded-lg bg-muted overflow-hidden">
        <div className="absolute inset-y-0 right-0 w-[30%] bg-primary/20" />
        <div className="absolute top-3 right-[7%] h-4 w-4 rounded-full bg-primary" />
        <div
          className="absolute top-3 bottom-2.5 left-2 right-[36%]"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 3px, transparent 3px, transparent 10px)' }}
        />
      </div>
    ),
  },
  {
    layout: 'single-column',
    label: 'Une colonne',
    thumb: (
      <div className="relative h-20 w-full rounded-lg bg-muted overflow-hidden">
        <div className="absolute top-2.5 left-[8%] right-[8%] h-4 rounded bg-primary/20 flex items-center">
          <div className="ml-2 h-2.5 w-2.5 rounded-full bg-primary" />
        </div>
        <div
          className="absolute top-9 bottom-2.5 left-[8%] right-[8%]"
          style={{ backgroundImage: 'repeating-linear-gradient(to bottom, var(--border) 0px, var(--border) 3px, transparent 3px, transparent 10px)' }}
        />
      </div>
    ),
  },
]

export default function TemplateSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Un point de départ — tout reste réajustable ensuite, bloc par bloc.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {TEMPLATES.map(({ layout, label, thumb }) => (
          <button
            key={layout}
            type="button"
            onClick={() => onChange(layout)}
            className={`rounded-xl border-2 p-2.5 text-center transition-all ${
              value === layout
                ? 'border-primary shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_16%,transparent)]'
                : 'border-border hover:border-primary/40'
            }`}
          >
            {thumb}
            <span className="mt-2 block text-xs font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
