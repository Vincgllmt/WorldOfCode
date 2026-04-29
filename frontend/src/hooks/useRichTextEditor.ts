'use client'

import { useCallback, useMemo } from 'react'
import type { IAllProps as TinyMCEEditorProps } from '@tinymce/tinymce-react'
import type { Editor as TinyMCEEditor } from 'tinymce'
import toast from 'react-hot-toast'
import { uploadImage } from '@/services/uploadService'
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES, MAX_IMAGE_SIZE_MB } from '@/config/upload'

type EditorInit = NonNullable<TinyMCEEditorProps['init']>
type UploadHandler = NonNullable<EditorInit['images_upload_handler']>
type EditorChangeHandler = NonNullable<TinyMCEEditorProps['onEditorChange']>

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif',
  webp: 'image/webp',
}

export const useRichTextEditor = (onChange: (value: string) => void) => {
  const handleImageUpload: UploadHandler = useCallback(async (blobInfo) => {
    const blob = blobInfo.blob()
    const fileName = typeof blobInfo.filename === 'function' ? blobInfo.filename() : 'upload'
    const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = blob.type || EXT_TO_MIME[ext] || ''
    const file = new File([blob], fileName, { type: mimeType })

    if (!ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      throw new Error('Format non support\u00e9')
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      throw new Error(`L'image ne doit pas d\u00e9passer ${MAX_IMAGE_SIZE_MB} Mo.`)
    }

    try {
      const { url } = await uploadImage(file)
      return url
    } catch (error) {
      console.error("Erreur lors du t\u00e9l\u00e9versement de l'image", error)
      toast.error("Impossible de t\u00e9l\u00e9verser l'image")
      throw error instanceof Error ? error : new Error("\u00c9chec du t\u00e9l\u00e9versement")
    }
  }, [])

  const handleEditorChange: EditorChangeHandler = useCallback((nextValue) => {
    onChange(nextValue)
  }, [onChange])

  const editorInit = useMemo<TinyMCEEditorProps['init']>(() => {
    const baseSettings: EditorInit = {
      skin_url: '/tinymce/skins/ui/oxide',
      content_css: '/tinymce/skins/ui/oxide/content.min.css',
      menubar: false,
      statusbar: false,
      height: 200,
      plugins: 'advlist autolink autoresize codesample link image lists',
      toolbar: 'undo redo | bold italic | bullist numlist | link image codesample',
      toolbar_mode: 'sliding',
      placeholder: 'Partage ton id\u00e9e\u2026 Tu peux ajouter du code, une image ou un lien.',
      branding: false,
      content_style:
        'body { font-family: var(--font-geist-sans, system-ui); font-size: 14px; line-height: 1.6; } pre, code { font-family: var(--font-geist-mono, ui-monospace); } img { max-width: 100%; height: auto; }',
      images_upload_handler: handleImageUpload,
      automatic_uploads: true,
      file_picker_types: 'image',
      convert_urls: false,
      relative_urls: false,
      codesample_content_css: '/prism-dracula.css',
      setup: (editor: TinyMCEEditor) => {
        const addParagraphAfterCode = () => {
          const body = editor.getBody()
          const lastChild = body?.lastChild
          if (lastChild?.nodeName === 'PRE') {
            editor.selection.select(lastChild, true)
            editor.selection.collapse(false)
            editor.insertContent('<p><br /></p>')
          }
        }

        editor.on('ExecCommand', (event) => {
          if (event.command === 'mceCodesample') {
            setTimeout(addParagraphAfterCode, 0)
          }
        })

        editor.on('init', () => {
          const themeMap: Record<string, { bg: string; fg: string }> = {
            dark: { bg: '#1f2937', fg: '#f9fafb' },
            'cyberpunk-dark': { bg: '#12121c', fg: '#e0f2fe' },
            'cyberpunk-light': { bg: '#f0f9ff', fg: '#0c1222' },
          }
          const defaultColors = { bg: '#ffffff', fg: '#111827' }

          const applyTheme = () => {
            const htmlClass = document.documentElement.className
            const matched = Object.keys(themeMap).find((cls) => htmlClass.includes(cls))
            const { bg, fg } = matched ? themeMap[matched] : defaultColors
            const iframeBody = editor.getBody()
            if (iframeBody) {
              iframeBody.style.backgroundColor = bg
              iframeBody.style.color = fg
            }
          }
          applyTheme()
          const observer = new MutationObserver(applyTheme)
          observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
          editor.on('remove', () => observer.disconnect())
        })
      },
    }

    return baseSettings
  }, [handleImageUpload])

  return {
    editorInit,
    handleEditorChange,
  }
}
