'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Copy, Check, RefreshCw, Loader2 } from 'lucide-react'
import { useShareCvLink } from '@/hooks/useShareCvLink'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: number
  currentToken?: string | null
}

export default function ShareCvDialog({ open, onOpenChange, userId, currentToken }: Props) {
  const { url, generateLink, isGenerating } = useShareCvLink(userId, currentToken)
  const [copied, setCopied] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Génère automatiquement si pas de token à l'ouverture
  useEffect(() => {
    if (open && !currentToken) {
      generateLink()
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCopy() {
    if (!url) return
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleConfirmRegenerate() {
    generateLink()
    setShowConfirm(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Partager mon CV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground">
            Ce lien permet à n'importe qui de consulter votre CV public, sans compte.
          </p>

          {/* Input + bouton copier */}
          <div className="flex gap-2">
            <input
              readOnly
              value={url ?? ''}
              placeholder={isGenerating ? 'Génération en cours…' : ''}
              className="flex-1 rounded-md border border-border/70 bg-muted px-3 py-2 text-sm text-foreground outline-none"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!url || isGenerating}
              onClick={handleCopy}
              className="shrink-0 gap-1.5"
            >
              {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              {copied ? 'Copié !' : 'Copier'}
            </Button>
          </div>

          {/* Régénérer */}
          {!showConfirm ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isGenerating}
              onClick={() => setShowConfirm(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Régénérer le lien
            </Button>
          ) : (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
              <p>Attention : l'ancien lien sera immédiatement invalide pour toute personne qui l'a reçu.</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="destructive" onClick={handleConfirmRegenerate}>
                  Confirmer
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowConfirm(false)}>
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
