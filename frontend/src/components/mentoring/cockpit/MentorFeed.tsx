import type { MentorProfile, MentoringRequest } from '@/types/mentoring'

interface Props {
  mentorProfile: MentorProfile
  onSelectRequest: (request: MentoringRequest) => void
  selectedRequestId: number | null
}

export default function MentorFeed({ mentorProfile, onSelectRequest, selectedRequestId }: Props) {
  return (
    <div className="p-6 text-muted-foreground text-sm">
      Feed des demandes — implémenté en story 10.3
    </div>
  )
}
