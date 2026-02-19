'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

const glitchLines = [
  '$ cd /page-you-wanted',
  'bash: cd: /page-you-wanted: No such file or directory',
  '$ find / -name "this-page" -type f',
  '  ... searching ...',
  '  0 results found.',
  '$ echo $?',
  '  404',
]

export default function NotFound() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Terminal window */}
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 border-b border-border bg-muted px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-500" />
            <span className="h-3 w-3 rounded-full bg-yellow-500" />
            <span className="h-3 w-3 rounded-full bg-green-500" />
            <span className="ml-2 text-xs font-mono text-muted-foreground">
              ~/world-of-code
            </span>
          </div>

          {/* Terminal body */}
          <div className="p-5 font-mono text-sm leading-relaxed">
            {glitchLines.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.3 }}
                className={
                  line.startsWith('$')
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground'
                }
              >
                {line}
              </motion.div>
            ))}

            {/* Blinking cursor */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ delay: 1.8, duration: 1, repeat: Infinity }}
              className="inline-block mt-2 text-primary"
            >
              $ _
            </motion.span>
          </div>
        </div>

        {/* Error info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.2, duration: 0.5 }}
          className="mt-8 text-center"
        >
          <h1 className="text-6xl font-bold font-mono text-primary">404</h1>
          <p className="mt-2 text-muted-foreground">
            Cette page n&apos;existe pas. Peut-etre un <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">git checkout</code> qui a mal tourne ?
          </p>
          <Link
            href="/home"
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            cd /home
          </Link>
        </motion.div>
      </motion.div>
    </div>
  )
}
