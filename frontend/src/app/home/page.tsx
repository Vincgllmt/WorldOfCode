'use client'

import { useState, useRef, useCallback } from 'react'
import { PenSquare, Newspaper, Sparkles, Clock, Plus } from 'lucide-react'
import PostForm from '@/components/post/postForm'
import PostList from '@/components/post/PostList'
import TechWatchFeedList from '@/components/techwatch/TechWatchFeedList'
import SuggestionsSidebar from '@/components/suggestions/SuggestionsSidebar'
import MyGroupsSidebar from '@/components/group/MyGroupsSidebar'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const tabs = [
  { key: 'publications', label: 'Publications', icon: PenSquare },
  { key: 'actualites', label: 'Actualités', icon: Newspaper },
]

type FeedMode = 'feed' | 'chronological'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('publications')
  const [feedMode, setFeedMode] = useState<FeedMode>('chronological')
  const [isNewPostOpen, setIsNewPostOpen] = useState(false)
  const scrollPositions = useRef<Record<string, number>>({})

  const handleTabChange = useCallback((newTab: string) => {
    scrollPositions.current[activeTab] = window.scrollY
    setActiveTab(newTab)

    const saved = scrollPositions.current[newTab]
    requestAnimationFrame(() => {
      window.scrollTo(0, saved ?? 0)
    })
  }, [activeTab])

  return (
    <div className="mx-auto max-w-[1400px] px-4">
      <div className="flex justify-center gap-8">

        {/* Sidebar gauche — sticky sous la navbar */}
        <aside className="hidden lg:block w-[220px] shrink-0">
          <div className="sticky top-[calc(var(--navbar-height,64px)+40px)] pt-4">
            <MyGroupsSidebar />
          </div>
        </aside>

        {/* Colonne centrale : tabs + feed */}
        <div className="w-full max-w-[680px]">
          {/* Barre sticky : tabs + toggle + bouton (bloc unifié) */}
          <div className="sticky top-[var(--navbar-height,64px)] z-30 bg-background/80 backdrop-blur-md py-2">
            <div className="bg-muted/50 border border-border/70 rounded-2xl overflow-hidden">
              {/* Tabs Publications / Actualités */}
              <div className="flex gap-1 p-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={cn(
                        'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  )
                })}
              </div>

              {/* Sous-barre tri + bouton — visible seulement sur Publications */}
              {activeTab === 'publications' && (
                <div className="flex items-center justify-between gap-2 px-2 py-2 border-t border-border/50 bg-background/30">
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => setFeedMode('chronological')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        feedMode === 'chronological'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Récent
                    </button>
                    <button
                      onClick={() => setFeedMode('feed')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                        feedMode === 'feed'
                          ? 'bg-background text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Pertinent
                    </button>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setIsNewPostOpen(true)}
                    className="gap-1.5 rounded-lg h-8"
                  >
                    <Plus className="h-4 w-4" />
                    Nouveau post
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-6 pb-8 pt-4">
            {activeTab === 'publications' && <PostList mode={feedMode} />}
            {activeTab === 'actualites' && <TechWatchFeedList />}
          </div>
        </div>

        {/* Modale Nouveau post */}
        <Dialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen}>
          <DialogContent
            className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
            onInteractOutside={(e) => {
              // Empêche la fermeture de la modale quand on clique dans
              // une fenêtre TinyMCE (rendue dans body, hors du Dialog).
              const target = e.target as HTMLElement
              if (target.closest('.tox-dialog, .tox-tinymce-aux, .tox-silver-sink')) {
                e.preventDefault()
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>Nouvelle publication</DialogTitle>
            </DialogHeader>
            <PostForm onSuccess={() => setIsNewPostOpen(false)} />
          </DialogContent>
        </Dialog>

        {/* Sidebar droite — sticky sous la navbar */}
        <aside className="hidden xl:block w-[300px] shrink-0">
          <div className="sticky top-[calc(var(--navbar-height,64px)+40px)] pt-4">
            <SuggestionsSidebar />
          </div>
        </aside>

      </div>
    </div>
  )
}
