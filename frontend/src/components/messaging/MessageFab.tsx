'use client'

import * as React from 'react'
import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { MessagePanel } from './MessagePanel'

type MessageFabProps = {
  onSelectConversation?: (conversationId: string) => void
}

export function MessageFab({ onSelectConversation }: MessageFabProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Ouvrir la messagerie"
        className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-primary p-0 shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
      >
        <MessageCircle className="size-6" aria-hidden="true" />
      </Button>
      <MessagePanel
        open={isOpen}
        onOpenChange={setIsOpen}
        onSelectConversation={onSelectConversation}
      />
    </>
  )
}
