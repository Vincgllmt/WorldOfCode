'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Upload } from 'lucide-react'
import { ALLOWED_AVATAR_TYPES, MAX_IMAGE_SIZE_MB } from '@/config/upload'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8090'

export const DEFAULT_AVATARS = [
    '/avatars/avatar1.png',
    '/avatars/avatar2.png',
    '/avatars/avatar3.png',
    '/avatars/avatar4.png',
    '/avatars/avatar5.png',
]

type AvatarPickerProps = {
    value: string | null
    onChange: (url: string | null) => void
    username?: string
}

function getInitials(username: string): string {
    const trimmed = username.trim()
    if (!trimmed) return '?'
    return trimmed.slice(0, 2).toUpperCase()
}

export default function AvatarPicker({ value, onChange, username = '' }: AvatarPickerProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState<string | null>(null)

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
            setUploadError('Format non supporté. Utilisez JPG, PNG, WEBP, GIF ou SVG.')
            return
        }
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
            setUploadError(`Image trop lourde (max ${MAX_IMAGE_SIZE_MB} Mo).`)
            return
        }

        setUploadError(null)
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
            })
            if (!res.ok) {
                const body = await res.json().catch(() => ({}))
                throw new Error(body?.error ?? "Impossible d'uploader l'image.")
            }
            const data = await res.json()
            onChange(data.url)
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Impossible d'uploader l'image.")
        } finally {
            setUploading(false)
            // reset input so the same file can be re-selected
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    return (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
                Choisissez une photo de profil (facultatif)
            </p>

            {/* Aperçu de la sélection */}
            <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center border-2 border-primary/30">
                    {value ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={value}
                            alt="Aperçu avatar"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <span className="text-lg font-semibold text-primary select-none">
                            {getInitials(username) || '?'}
                        </span>
                    )}
                </div>
            </div>

            {/* Avatars par défaut */}
            <div className="flex justify-center gap-3 flex-wrap">
                {DEFAULT_AVATARS.map((src, idx) => (
                    <button
                        key={src}
                        type="button"
                        onClick={() => onChange(src)}
                        className={cn(
                            'h-12 w-12 rounded-full overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                            value === src
                                ? 'border-primary scale-110 shadow-md'
                                : 'border-transparent hover:border-primary/50 hover:scale-105'
                        )}
                        aria-label={`Avatar par défaut ${idx + 1}`}
                    >
                        <Image
                            src={src}
                            alt={`Avatar ${idx + 1}`}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                        />
                    </button>
                ))}
            </div>

            {/* Upload personnalisé */}
            <div className="flex flex-col items-center gap-1">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={[...ALLOWED_AVATAR_TYPES, '.svg'].join(',')}
                    className="hidden"
                    onChange={handleFileChange}
                />
                <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition disabled:opacity-50"
                >
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Upload en cours…' : 'Importer ma propre photo'}
                </button>
                {uploadError && (
                    <p className="text-xs text-red-500">{uploadError}</p>
                )}
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="text-xs text-muted-foreground hover:text-red-500 transition"
                    >
                        Supprimer
                    </button>
                )}
            </div>
        </div>
    )
}
