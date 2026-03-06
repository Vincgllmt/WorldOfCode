'use client'

import { useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useSanitizedContent } from '@/hooks/useSanitizedContent'
import styles from './PostContent.module.css'
import 'prismjs/themes/prism-tomorrow.css'

export interface PostContentProps {
  readonly content: string | null
  readonly className?: string
}

export default function PostContent({ content, className }: PostContentProps) {
  const sanitized = useSanitizedContent(content ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    // require() is safe here — useEffect never runs server-side
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Prism = require('prismjs')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-markup')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-markup-templating')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-javascript')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-typescript')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-jsx')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-tsx')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-css')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-python')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-bash')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-json')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-sql')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-java')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-c')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-cpp')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-php')
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('prismjs/components/prism-yaml')
    Prism.highlightAllUnder(ref.current)
  }, [sanitized])

  return (
    <div
      ref={ref}
      className={cn(
        'space-y-3 text-base leading-relaxed text-foreground',
        '[&_p]:whitespace-pre-line',
        '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5',
        '[&_a]:text-blue-600 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-blue-500 dark:[&_a]:text-blue-400 dark:hover:[&_a]:text-blue-300',
        '[&_pre]:rounded-lg [&_pre]:overflow-x-auto',
        '[&_code]:font-mono [&_code]:text-sm',
        '[&_img]:rounded-lg [&_img]:max-w-full [&_img]:h-auto [&_img]:mx-auto',
        styles.postHtml,
        className
      )}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
