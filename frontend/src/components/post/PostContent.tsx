'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSanitizedContent } from '@/hooks/useSanitizedContent'
import styles from './PostContent.module.css'
import Prism from 'prismjs'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-yaml'

export interface PostContentProps {
  readonly content: string | null
  readonly className?: string
}

export default function PostContent({ content, className }: PostContentProps) {
  const sanitized = useSanitizedContent(content ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) {
      Prism.highlightAllUnder(ref.current)
    }
  }, [sanitized])

  return (
    <div
      ref={ref}
      className={cn(
        'space-y-3 text-base leading-relaxed text-foreground',
        '[&_p]:whitespace-pre-line',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-500 dark:[&_a]:text-blue-400 dark:hover:[&_a]:text-blue-300',
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
