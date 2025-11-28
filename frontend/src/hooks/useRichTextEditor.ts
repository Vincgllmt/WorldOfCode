'use client'

import { useCallback, useMemo } from 'react'
import type { IAllProps as TinyMCEEditorProps } from '@tinymce/tinymce-react'
import type { Editor as TinyMCEEditor } from 'tinymce'
import toast from 'react-hot-toast'
import { uploadImage } from '@/services/uploadService'

type EditorInit = NonNullable<TinyMCEEditorProps['init']>
type UploadHandler = NonNullable<EditorInit['images_upload_handler']>
type EditorChangeHandler = NonNullable<TinyMCEEditorProps['onEditorChange']>

export const useRichTextEditor = (onChange: (value: string) => void) => {
  const handleImageUpload: UploadHandler = useCallback(async (blobInfo) => {
    try {
      const blob = blobInfo.blob()
      const fileName = typeof blobInfo.filename === 'function' ? blobInfo.filename() : 'upload'
      const file = new File([blob], fileName, { type: blob.type })
      const { url } = await uploadImage(file)
      return url
    } catch (error) {
      console.error('Erreur lors du téléversement de l’image', error)
      toast.error("Impossible de téléverser l'image")
      throw error instanceof Error ? error : new Error("Échec du téléversement")
    }
  }, [])

  const handleEditorChange: EditorChangeHandler = useCallback((nextValue) => {
    onChange(nextValue)
  }, [onChange])

  const editorInit = useMemo<TinyMCEEditorProps['init']>(() => {
    const baseSettings: EditorInit = {
      skin: false,
      content_css: false,
      menubar: false,
      statusbar: false,
      height: 320,
      plugins: 'advlist autolink autoresize codesample link image lists',
      toolbar: 'undo redo | bold italic | bullist numlist | link image codesample',
      toolbar_mode: 'sliding',
      placeholder: 'Partage ton idée… Tu peux ajouter du code, une image ou un lien.',
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
      },
    }

    return baseSettings
  }, [handleImageUpload])

  return {
    editorInit,
    handleEditorChange,
  }
}
