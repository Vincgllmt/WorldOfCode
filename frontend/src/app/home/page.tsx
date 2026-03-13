'use client'

import { useState, useRef, useCallback } from 'react'
import { PenSquare, Newspaper } from 'lucide-react'
import PostForm from '@/components/post/postForm'
import PostList from '@/components/post/PostList'
import TechWatchFeedList from '@/components/techwatch/TechWatchFeedList'
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
    <>
      <div className="fixed top-[var(--navbar-height,64px)] left-0 right-0 z-30 bg-background/80 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 py-2">
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
      </div>

      <div className="max-w-2xl mx-auto p-4 pt-20 space-y-6">
        {activeTab === 'publications' && (
          <div className="space-y-6">
            <PostForm />
            <PostList />
          </div>
        )}
        {activeTab === 'actualites' && <TechWatchFeedList />}
      </div>
    </>
  )
}
