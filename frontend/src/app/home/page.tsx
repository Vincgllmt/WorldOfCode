'use client'

import { useState, useRef, useCallback } from 'react'
import { PenSquare, Newspaper } from 'lucide-react'
import PostForm from '@/components/post/postForm'
import PostList from '@/components/post/PostList'
import TechWatchFeedList from '@/components/techwatch/TechWatchFeedList'
import SuggestionsSidebar from '@/components/suggestions/SuggestionsSidebar'
import MyGroupsSidebar from '@/components/group/MyGroupsSidebar'
import { cn } from '@/lib/utils'

const tabs = [
  { key: 'publications', label: 'Publications', icon: PenSquare },
  { key: 'actualites', label: 'Actualités', icon: Newspaper },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('publications')
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
        <aside className="hidden xl:block w-[220px] shrink-0">
          <div className="sticky top-[calc(var(--navbar-height,64px)+40px)] pt-4">
            <MyGroupsSidebar />
          </div>
        </aside>

        {/* Colonne centrale : tabs + feed */}
        <div className="w-full max-w-[680px]">
          {/* Barre de tabs sticky */}
          <div className="sticky top-[var(--navbar-height,64px)] z-30 bg-background/80 backdrop-blur-md py-2">
            <div className="flex gap-1 bg-muted/50 border border-border/70 rounded-2xl p-1.5">
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
          </div>

          {/* Feed */}
          <div className="space-y-6 pb-8 pt-4">
            {activeTab === 'publications' && (
              <div className="space-y-6">
                <PostForm />
                <PostList />
              </div>
            )}
            {activeTab === 'actualites' && <TechWatchFeedList />}
          </div>
        </div>

        {/* Sidebar droite — sticky sous la navbar */}
        <aside className="hidden lg:block w-[300px] shrink-0">
          <div className="sticky top-[calc(var(--navbar-height,64px)+40px)] pt-4">
            <SuggestionsSidebar />
          </div>
        </aside>

      </div>
    </div>
  )
}
