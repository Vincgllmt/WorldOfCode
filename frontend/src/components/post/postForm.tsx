'use client'

import { Button } from '@/components/ui/button'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import RichTextEditor from './RichTextEditor'
import { Controller, usePostFormController } from '@/hooks/usePostFormController'

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
  const {
    control,
    handleSubmit,
    errors,
    groups,
    loadingGroups,
    isPending,
    groupIdValue,
    setGroupId,
    onSubmit,
  } = usePostFormController(presetGroupId, onSuccess)

  const displaySelector =
    showGroupSelector ?? typeof presetGroupId === 'undefined'

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className={cn('space-y-4 rounded-xl bg-muted p-6 shadow-sm', className)}
    >
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

      {displaySelector ? (
        <div className="space-y-2">
          <Label htmlFor="post-group">Groupe</Label>
          <Select
            value={groupIdValue ? String(groupIdValue) : undefined}
            onValueChange={(value) =>
              setGroupId(Number(value))
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
                groups?.map((group) => (
                  <SelectItem key={group.id} value={String(group.id)}>
                    {group.name}
                  </SelectItem>
                ))
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
        className="w-full sm:w-auto"
        aria-busy={isPending}
      >
        {isPending ? 'Publication...' : submitLabel}
      </Button>
    </form>
  )
}
