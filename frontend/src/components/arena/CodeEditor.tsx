'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const MONACO_LANGUAGE: Record<string, string> = {
  javascript: 'javascript',
  php: 'php',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  typescript: 'typescript',
}

interface CodeEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
}

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const { resolvedTheme } = useTheme()
  // `dark:` côté CSS couvre .dark ET .cyberpunk-dark : on aligne Monaco dessus.
  const isDark = resolvedTheme === 'dark' || resolvedTheme === 'cyberpunk-dark'

  return (
    <MonacoEditor
      height="100%"
      language={MONACO_LANGUAGE[language] ?? language}
      value={value}
      theme={isDark ? 'vs-dark' : 'light'}
      onChange={(val) => onChange(val ?? '')}
      options={{
        fontSize: 14,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        tabSize: 2,
        automaticLayout: true,
        padding: { top: 12, bottom: 12 },
      }}
    />
  )
}
