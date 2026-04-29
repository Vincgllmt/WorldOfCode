'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
// 1. Importez dynamic de Next.js
import dynamic from 'next/dynamic' 
import { Controller, usePostFormController } from '@/hooks/usePostFormController'
import { motion, AnimatePresence } from 'framer-motion'
import { Check } from 'lucide-react'

// 2. Supprimez l'import statique : import RichTextEditor from './RichTextEditor'

// 3. Créez l'import dynamique avec ssr: false
const RichTextEditor = dynamic(() => import('./RichTextEditor'), {
  ssr: false, // Ceci empêche le serveur de toucher à ce composant
  loading: () => <div className="h-64 border rounded-md bg-muted animate-pulse" /> // Optionnel: un placeholder pendant le chargement
})

type PostFormProps = {
  readonly presetGroupId?: number
  readonly showGroupSelector?: boolean
  readonly className?: string
  readonly onSuccess?: () => void
  readonly submitLabel?: string
}

export default function PostForm({
  presetGroupId,
  showGroupSelector,
  className,
  onSuccess,
  submitLabel = 'Publier',
}: PostFormProps = {}) {
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSuccess = () => {
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 2000)
    onSuccess?.()
  }

  const {
    control,
    handleSubmit,
    errors,
    groups,
    loadingGroups,
    isPending,
    groupIdValue,
    setGroupId,
    selectKey,
    onSubmit,
  } = usePostFormController(presetGroupId, handleSuccess)

  const displaySelector =
    showGroupSelector ?? typeof presetGroupId === 'undefined'

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('relative space-y-4 rounded-xl bg-muted p-6 shadow-sm overflow-hidden', className)}
    >
      {/* Flash de succès */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-primary/10 backdrop-blur-sm rounded-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-primary-foreground font-medium shadow-lg"
            >
              <Check className="h-5 w-5" />
              Post publié !
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        <Controller
          control={control}
          name="content"
          render={({ field }) => (
            <RichTextEditor
              id="post-content"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              disabled={isPending}
            />
          )}
        />
        {errors.content && (
          <p className="text-sm text-red-500" aria-live="polite">
            {errors.content.message}
          </p>
        )}
      </div>

      <div className="flex items-start gap-3">
        {displaySelector ? (
          <div className="flex-1 space-y-1">
            <Select
              key={selectKey}
              value={groupIdValue ? String(groupIdValue) : undefined}
              onValueChange={(value) =>
                setGroupId(value === 'none' ? undefined : Number(value))
              }
              disabled={loadingGroups || isPending}
            >
              <SelectTrigger id="post-group">
                <SelectValue placeholder="Choisissez un groupe" />
              </SelectTrigger>
              <SelectContent>
                {loadingGroups ? (
                  <p className="px-4 py-2 text-sm text-muted-foreground">
                    Chargement...
                  </p>
                ) : (
                  <>
                    <SelectItem value="none">Sans groupe</SelectItem>
                    {groups?.map((group) => (
                      <SelectItem key={group.id} value={String(group.id)}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
            {errors.groupId && (
              <p className="text-sm text-red-500" aria-live="polite">
                {errors.groupId.message}
              </p>
            )}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={isPending}
          className={displaySelector ? 'shrink-0' : 'w-full sm:w-auto'}
          aria-busy={isPending}
        >
          {isPending ? 'Publication...' : submitLabel}
        </Button>
      </div>
    </form>
  )
}