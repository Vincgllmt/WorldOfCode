'use client'

import { useState } from 'react'
import PostForm from '@/components/post/postForm'
import PostList from '@/components/post/PostList'
import TechWatchFeedList from '@/components/techwatch/TechWatchFeedList'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('publications')

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="publications">Publications</TabsTrigger>
          <TabsTrigger value="actualites">Actualités</TabsTrigger>
        </TabsList>

        <TabsContent value="publications">
          <div className="space-y-6">
            <PostForm />
            <PostList />
          </div>
        </TabsContent>

        <TabsContent value="actualites">
          <TechWatchFeedList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
