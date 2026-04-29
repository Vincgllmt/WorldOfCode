'use client'

import { useState, useCallback, useEffect } from 'react'
import { LayoutList, Zap } from 'lucide-react'
import MentorSidebar from './MentorSidebar'
import MentorFeed from './MentorFeed'
import MentorRightPanel from './MentorRightPanel'
import MentorSessionsFeed from './MentorSessionsFeed'
import MentorSessionRightPanel from './MentorSessionRightPanel'
import ModeToggle from './ModeToggle'
import { getMentorActiveSessions } from '@/lib/api/mentoring/sessions'
import type { MentorProfile, MentoringRequest, MentoringSession } from '@/types/mentoring'
import { cn } from '@/lib/utils'

type CockpitMode = 'requests' | 'sessions'

interface Props {
  initialProfile: MentorProfile
}

export default function MentorCockpitPage({ initialProfile }: Props) {
  const [profile, setProfile] = useState(initialProfile)
  const [cockpitMode, setCockpitMode] = useState<CockpitMode>('requests')

  // requests mode
  const [selectedRequest, setSelectedRequest] = useState<MentoringRequest | null>(null)
  const [pinnedRequests, setPinnedRequests] = useState<MentoringRequest[]>([])

  // sessions mode
  const [selectedSession, setSelectedSession] = useState<MentoringSession | null>(null)

  // shared active sessions for sidebar
  const [activeSessions, setActiveSessions] = useState<MentoringSession[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const refreshSessions = useCallback(async () => {
    try {
      const sessions = await getMentorActiveSessions()
      setActiveSessions(sessions)
    } catch {}
  }, [])

  useEffect(() => { refreshSessions() }, [refreshSessions])

  const handleSwitchMode = (mode: CockpitMode) => {
    setCockpitMode(mode)
    setSelectedRequest(null)
    setSelectedSession(null)
  }

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
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="hidden md:flex lg:hidden items-center gap-1 text-sm text-muted-foreground"
            aria-label={sidebarOpen ? 'Masquer la sidebar' : 'Afficher la sidebar'}
          >
            {sidebarOpen ? '◀ Masquer' : '▶ Stats'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        {sidebarOpen && (
          <aside className="hidden md:flex flex-col w-[260px] shrink-0 border-r border-border overflow-y-auto">
            <MentorSidebar pinnedRequests={pinnedRequests} activeSessions={activeSessions} onSessionUpdate={refreshSessions} />
          </aside>
        )}

        {/* Center — tab bar + content */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Mode tab bar */}
          <div className="flex border-b border-border shrink-0">
            <ModeTab
              active={cockpitMode === 'requests'}
              onClick={() => handleSwitchMode('requests')}
              Icon={LayoutList}
            >
              Demandes
            </ModeTab>
            <ModeTab
              active={cockpitMode === 'sessions'}
              onClick={() => handleSwitchMode('sessions')}
              Icon={Zap}
            >
              Sessions
            </ModeTab>
          </div>

          <div className="flex-1 overflow-y-auto">
            {cockpitMode === 'requests' && (
              <MentorFeed
                mentorProfile={profile}
                onSelectRequest={(r) => { setSelectedRequest(r); setSelectedSession(null) }}
                selectedRequestId={selectedRequest?.id ?? null}
                onPinnedChange={setPinnedRequests}
                onSessionAccepted={refreshSessions}
              />
            )}
            {cockpitMode === 'sessions' && (
              <MentorSessionsFeed
                selectedSessionId={selectedSession?.id ?? null}
                onSelectSession={(s) => { setSelectedSession(s); setSelectedRequest(null) }}
              />
            )}
          </div>
        </main>

        {/* Right panel */}
        {selectedRequest && cockpitMode === 'requests' && (
          <aside className="hidden lg:flex flex-col w-[320px] shrink-0 border-l border-border overflow-y-auto">
            <MentorRightPanel request={selectedRequest} />
          </aside>
        )}
        {selectedSession && cockpitMode === 'sessions' && (
          <aside className="hidden lg:flex flex-col w-[320px] shrink-0 border-l border-border overflow-y-auto">
            <MentorSessionRightPanel session={selectedSession} />
          </aside>
        )}
      </div>
    </div>
  )
}

function ModeTab({
  active, onClick, Icon, children,
}: {
  active: boolean
  onClick: () => void
  Icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  )
}
