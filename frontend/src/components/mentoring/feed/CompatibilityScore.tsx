interface Props { score: number }

export default function CompatibilityScore({ score }: Props) {
  const barColor = score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-orange-400' : 'bg-red-400'
  const textColor = score >= 80
    ? 'text-green-600 dark:text-green-400'
    : score >= 60
    ? 'text-orange-600 dark:text-orange-400'
    : 'text-red-600 dark:text-red-400'

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>Score de compatibilité</span>
        <span className={`font-bold ${textColor}`}>{score}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Score de compatibilité : ${score}%`}
        />
      </div>
      <p className="text-xs text-muted-foreground">Score indicatif V1</p>
    </div>
  )
}
