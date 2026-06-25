'use client'

import { Download } from 'lucide-react'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-2 rounded-md border border-border/70 bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
    >
      <Download className="h-4 w-4" />
      Exporter PDF
    </button>
  )
}
