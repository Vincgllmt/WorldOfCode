'use client'

import dynamic from 'next/dynamic'
import { useTheme } from 'next-themes'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const MONACO_LANGUAGE: Record<string, string> = {
  javascript: 'javascript',
  php: 'php',
}

interface CodeEditorProps {
  language: string
  value: string
  onChange: (value: string) => void
}

export default function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const { resolvedTheme } = useTheme()

  return (
    <MonacoEditor
      height="100%"
      language={MONACO_LANGUAGE[language] ?? language}
      value={value}
      theme={resolvedTheme === 'dark' ? 'vs-dark' : 'light'}
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
