'use client'

import { useMemo } from 'react'
import { sanitizeHtml } from '@/lib/sanitizeHtml'

export const useSanitizedContent = (content: string) =>
  useMemo(() => sanitizeHtml(content ?? ''), [content])
