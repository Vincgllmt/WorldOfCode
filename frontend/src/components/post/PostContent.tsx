'use client'

import { cn } from '@/lib/utils'
import { useSanitizedContent } from '@/hooks/useSanitizedContent'
import styles from './PostContent.module.css'

export interface PostContentProps {
  readonly content: string | null
  readonly className?: string
}

export default function PostContent({ content, className }: PostContentProps) {
  const sanitized = useSanitizedContent(content ?? '')

  return (
    <div
      className={cn(
        'space-y-3 text-base leading-relaxed text-slate-900',
        '[&_p]:whitespace-pre-line',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_a]:text-blue-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-800',
        '[&_pre]:bg-slate-900 [&_pre]:text-slate-100 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto',
        '[&_code]:font-mono [&_code]:text-sm',
        '[&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:mx-auto',
        styles.postHtml,
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
