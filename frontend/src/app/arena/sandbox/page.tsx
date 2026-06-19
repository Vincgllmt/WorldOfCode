'use client'

import { useState } from 'react'
import { Play, AlertTriangle, Clock } from 'lucide-react'
import dynamic from 'next/dynamic'
import { runCode, type RunResult } from '@/services/arenaService'
import { Button } from '@/components/ui/button'

const CodeEditor = dynamic(() => import('@/components/arena/CodeEditor'), { ssr: false })

const SUPPORTED_LANGUAGES = ['javascript', 'typescript', 'python', 'php', 'java', 'cpp']

const DEFAULT_CODE: Record<string, string> = {
  javascript: '// Écris ton code ici\nconsole.log("Hello, World!");\n',
  typescript: '// Écris ton code ici\nconsole.log("Hello, World!");\n',
  python: '# Écris ton code ici\nprint("Hello, World!")\n',
  php: '<?php\n\n// Écris ton code ici\necho "Hello, World!";\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n',
  cpp: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n',
}

export default function SandboxPage() {
  const [language, setLanguage] = useState('javascript')
  const [code, setCode] = useState(DEFAULT_CODE['javascript'])
  const [stdin, setStdin] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleLanguageChange(lang: string) {
    setLanguage(lang)
    setCode(DEFAULT_CODE[lang] ?? '')
    setResult(null)
    setError(null)
  }

  async function handleRun() {
    if (!code.trim()) return
    setIsRunning(true)
    setResult(null)
    setError(null)
    try {
      const res = await runCode(language, code, stdin || undefined)
      setResult(res)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="h-full flex flex-col">

      {/* Barre du haut */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60 bg-background/80 backdrop-blur-md flex-shrink-0">
        <span className="text-sm font-semibold">Bac à sable</span>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>

          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="gap-1.5"
          >
            <Play className="h-3.5 w-3.5" />
            {isRunning ? 'Exécution…' : 'Exécuter'}
          </Button>
        </div>
      </div>

      {/* Corps */}
      <div className="flex flex-1 overflow-hidden">

        {/* Éditeur */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0">
            <CodeEditor language={language} value={code} onChange={setCode} />
          </div>

          {/* Stdin */}
          <div className="border-t border-border/60 bg-muted/20 p-3 flex-shrink-0">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Entrée (stdin)</p>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              placeholder="Données d'entrée pour ton programme…"
              rows={3}
              className="w-full text-xs font-mono bg-background border border-border rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Sortie */}
        <div className="w-[380px] flex-shrink-0 border-l border-border/60 flex flex-col overflow-hidden">
          <div className="flex items-center px-4 py-2 border-b border-border/40 bg-muted/20 flex-shrink-0">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sortie</span>
          </div>

          <div className="flex-1 overflow-auto p-4 font-mono text-sm space-y-3">
            {error && (
              <div className="flex items-start gap-2 text-rose-500 text-sm font-sans">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {result && (
              <>
                {result.timedOut && (
                  <div className="flex items-center gap-2 text-amber-500 text-xs font-sans">
                    <Clock className="h-4 w-4" /> Délai dépassé (3 s)
                  </div>
                )}
                {result.stdout && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 font-sans">stdout</p>
                    <pre className="bg-muted/50 rounded-lg p-3 whitespace-pre-wrap break-all text-foreground">{result.stdout}</pre>
                  </div>
                )}
                {result.stderr && (
                  <div>
                    <p className="text-xs text-rose-500 mb-1 font-sans">stderr</p>
                    <pre className="bg-rose-500/10 rounded-lg p-3 whitespace-pre-wrap break-all text-rose-400">{result.stderr}</pre>
                  </div>
                )}
                {!result.stdout && !result.stderr && (
                  <p className="text-xs text-muted-foreground font-sans">Aucune sortie.</p>
                )}
                <p className="text-xs text-muted-foreground font-sans">Exit code : {result.exitCode}</p>
              </>
            )}

            {!result && !error && (
              <p className="text-xs text-muted-foreground font-sans">Lance ton code pour voir la sortie ici.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
