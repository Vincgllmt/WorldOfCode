'use client'

import dynamic from 'next/dynamic'
import type { IAllProps as TinyMCEEditorProps } from '@tinymce/tinymce-react'
import { cn } from '@/lib/utils'
import { useRichTextEditor } from '@/hooks/useRichTextEditor'
// TinyMCE base + plugins (client-side only through dynamic import)
import 'tinymce/tinymce'
import 'tinymce/icons/default'
import 'tinymce/themes/silver'
import 'tinymce/models/dom'
import 'tinymce/plugins/advlist'
import 'tinymce/plugins/autolink'
import 'tinymce/plugins/autoresize'
import 'tinymce/plugins/code'
import 'tinymce/plugins/codesample'
import 'tinymce/plugins/image'
import 'tinymce/plugins/link'
import 'tinymce/plugins/lists'
// TinyMCE styles (inline imports + disable remote loading)
import 'tinymce/skins/ui/oxide/skin.min.css'
import 'tinymce/skins/ui/oxide/content.min.css'

const TinyMCEEditor = dynamic<TinyMCEEditorProps>(
  () => import('@tinymce/tinymce-react').then((mod) => mod.Editor),
  { ssr: false }
)

export interface RichTextEditorProps {
  readonly id?: string
  readonly value: string
  readonly onChange: (value: string) => void
  readonly onBlur?: () => void
  readonly disabled?: boolean
  readonly className?: string
}

export default function RichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  className,
}: RichTextEditorProps) {
  const { editorInit, handleEditorChange } = useRichTextEditor(onChange)

  return (
    <div className={cn('rounded-lg border bg-background shadow-sm', className)}>
      <TinyMCEEditor
        id={id}
        value={value}
        init={editorInit}
        onEditorChange={handleEditorChange}
        onBlur={onBlur}
        disabled={disabled}
        licenseKey="gpl"
      />
    </div>
  )
}
