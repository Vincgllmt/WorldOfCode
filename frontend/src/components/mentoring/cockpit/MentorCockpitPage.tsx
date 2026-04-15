'use client'

import { useState, useCallback, useEffect } from 'react'
import MentorSidebar from './MentorSidebar'
import MentorFeed from './MentorFeed'
import MentorRightPanel from './MentorRightPanel'
import ModeToggle from './ModeToggle'
import { getMentorActiveSessions } from '@/lib/api/mentoring/sessions'
import type { MentorProfile, MentoringRequest, MentoringSession } from '@/types/mentoring'

interface Props {
  initialProfile: MentorProfile
}

export default function MentorCockpitPage({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile)
  const [selectedRequest, setSelectedRequest] = useState<MentoringRequest | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [pinnedRequests, setPinnedRequests] = useState<MentoringRequest[]>([])
  const [activeSessions, setActiveSessions] = useState<MentoringSession[]>([])

  const refreshSessions = useCallback(async () => {
    try {
      const sessions = await getMentorActiveSessions()
      setActiveSessions(sessions)
    } catch {}
  }, [])

  useEffect(() => { refreshSessions() }, [refreshSessions])

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Topbar */}
      <header className="flex items-center justify-between px-6 h-14 border-b border-border shrink-0">
        <h1 className="font-semibold text-lg">Espace Mentor</h1>
        <div className="flex items-center gap-4">
          <ModeToggle
            isAvailable={profile.isAvailable}
            onToggle={(newValue) => setProfile(p => ({ ...p, isAvailable: newValue }))}
          />
          {/* Bouton rétractable sidebar (tablette uniquement) */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="hidden md:flex lg:hidden items-center gap-1 text-sm text-muted-foreground"
            aria-label={sidebarOpen ? 'Masquer la sidebar' : 'Afficher la sidebar'}
          >
            {sidebarOpen ? '◀ Masquer' : '▶ Stats'}
          </button>
        </div>
      </header>

      {/* Layout 3 colonnes */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar gauche — masquée sur mobile, rétractable sur tablette */}
        {sidebarOpen && (
          <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-border overflow-y-auto">
            <MentorSidebar pinnedRequests={pinnedRequests} activeSessions={activeSessions} onSessionUpdate={refreshSessions} />
          </aside>
        )}

        {/* Feed central */}
        <main className="flex-1 overflow-y-auto">
          <MentorFeed
            mentorProfile={profile}
            onSelectRequest={setSelectedRequest}
            selectedRequestId={selectedRequest?.id ?? null}
            onPinnedChange={setPinnedRequests}
            onSessionAccepted={refreshSessions}
          />
        </main>

        {/* Panel droit — visible uniquement si une demande est sélectionnée, masqué sur mobile */}
        {selectedRequest && (
          <aside className="hidden lg:flex flex-col w-[320px] shrink-0 border-l border-border overflow-y-auto">
            <MentorRightPanel request={selectedRequest} />
          </aside>
        )}
      </div>
    </div>
  )
}
