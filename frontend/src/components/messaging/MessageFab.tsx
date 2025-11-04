'use client'

import * as React from 'react'
import { useState } from 'react'
import { Send } from 'lucide-react'

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
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-base font-semibold shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
      >
        <Send className="size-5" aria-hidden="true" />
        <span>Message</span>
      </Button>
      <MessagePanel
        open={isOpen}
        onOpenChange={setIsOpen}
        onSelectConversation={onSelectConversation}
      />
    </>
  )
}
