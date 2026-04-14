import type { MentoringRequest } from '@/types/mentoring'

interface Props {
  request: MentoringRequest
}

export default function MentorRightPanel({ request }: Props) {
  return (
    <div className="p-6 text-muted-foreground text-sm">
      Fiche junior — implémenté en story 10.4
    </div>
  )
}
