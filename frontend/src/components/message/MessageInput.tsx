import { useState, useRef, useEffect } from "react"
import CustomEmojiPicker from "./EmojiPicker"
import { Smile, Send, ImagePlus, Paperclip, X, Loader2, FileArchive } from "lucide-react"
import { socket } from "@/lib/socket"
import { uploadImage } from "@/services/uploadService"
import { checkImageNSFW, getNsfwBlockMessage } from "@/services/nsfwService"
import toast from "react-hot-toast"
import Image from "next/image"
import {
    ALLOWED_IMAGE_TYPES,
    ALLOWED_FILE_TYPES,
    MAX_IMAGE_SIZE_BYTES,
    MAX_FILE_SIZE_BYTES,
    MAX_FILE_SIZE_MB,
} from "@/config/upload"

type Props = {
    onSend: (body: string, type?: 'text' | 'image' | 'file') => void
    conversationId?: string
}

type ImageEntry = {
    file: File
    preview: string
}

const MAX_IMAGES = 10

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} o`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
    return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export function MessageInput({ onSend, conversationId }: Props) {
    const [input, setInput] = useState("")
    const [showPicker, setShowPicker] = useState(false)
    const [images, setImages] = useState<ImageEntry[]>([])
    const [zipFile, setZipFile] = useState<File | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const pickerRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const zipInputRef = useRef<HTMLInputElement>(null)
    const dropZoneRef = useRef<HTMLDivElement>(null)
    const typingTimeout = useRef<NodeJS.Timeout | null>(null)
    const dragCounter = useRef(0)

    useEffect(() => {
        return () => {
            if (typingTimeout.current) clearTimeout(typingTimeout.current)
        }
    }, [])

    // Fermer le picker emoji au clic extérieur
    useEffect(() => {
        if (!showPicker) return
        const handleClickOutside = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [showPicker])

    const emitTyping = (isTyping: boolean) => {
        if (!conversationId) return
        socket.emit("typing", { conversation_id: conversationId, is_typing: isTyping })
    }

    const handleSend = async () => {
        const hasFiles = images.length > 0 || zipFile

        if (hasFiles) {
            setIsUploading(true)
            try {
                // Envoyer les images
                for (const img of images) {
                    const { url } = await uploadImage(img.file)
                    onSend(url, 'image')
                }
                clearAllImages()

                // Envoyer le zip
                if (zipFile) {
                    const { url } = await uploadImage(zipFile)
                    // Body = JSON avec URL et nom du fichier
                    const body = JSON.stringify({ url, name: zipFile.name, size: zipFile.size })
                    onSend(body, 'file')
                    setZipFile(null)
                }

                // Texte accompagnant
                if (input.trim()) {
                    onSend(input)
                    setInput("")
                }
            } catch {
                toast.error("Erreur lors de l'envoi du fichier")
            } finally {
                setIsUploading(false)
            }
            emitTyping(false)
            return
        }
        if (input.trim()) {
            onSend(input)
            setInput("")
            emitTyping(false)
        }
    }

    const addImages = async (files: File[]) => {
        const remaining = MAX_IMAGES - images.length
        if (remaining <= 0) {
            toast.error(`Maximum ${MAX_IMAGES} images à la fois.`)
            return
        }

        // 1. Validation format/taille
        const candidates: File[] = []
        for (const file of files.slice(0, remaining)) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.type as typeof ALLOWED_IMAGE_TYPES[number])) {
                toast.error(`${file.name} : format non supporté.`)
                continue
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                toast.error(`${file.name} : dépasse ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} Mo.`)
                continue
            }
            candidates.push(file)
        }

        if (files.length > remaining) {
            toast.error(`Seulement ${remaining} image(s) ajoutée(s) (max ${MAX_IMAGES}).`)
        }

        if (candidates.length === 0) return

        // 2. Vérification NSFW
        const checkingToast = toast.loading('Vérification des images…')
        try {
            const results = await Promise.all(candidates.map((f) => checkImageNSFW(f)))
            const validFiles: ImageEntry[] = []

            for (let i = 0; i < candidates.length; i++) {
                const file = candidates[i]
                const result = results[i]
                if (result.blocked) {
                    toast.error(`${file.name} : ${getNsfwBlockMessage(result)}`)
                    continue
                }
                validFiles.push({ file, preview: URL.createObjectURL(file) })
            }

            if (validFiles.length > 0) {
                setImages((prev) => [...prev, ...validFiles])
            }
        } finally {
            toast.dismiss(checkingToast)
        }
    }

    const handleZipSelect = (file: File) => {
        if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.name.endsWith('.zip')) {
            toast.error("Seuls les fichiers .zip sont acceptés.")
            return
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            toast.error(`Le fichier ne doit pas dépasser ${MAX_FILE_SIZE_MB} Mo.`)
            return
        }
        setZipFile(file)
    }

    const removeImage = (index: number) => {
        setImages((prev) => {
            URL.revokeObjectURL(prev[index].preview)
            return prev.filter((_, i) => i !== index)
        })
    }

    const clearAllImages = () => {
        images.forEach((img) => URL.revokeObjectURL(img.preview))
        setImages([])
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return
        addImages(Array.from(files))
        if (fileInputRef.current) fileInputRef.current.value = ""
    }

    const handleZipInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        handleZipSelect(file)
        if (zipInputRef.current) zipInputRef.current.value = ""
    }

    // Drag & drop
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current++
        if (e.dataTransfer.types.includes("Files")) setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        dragCounter.current--
        if (dragCounter.current === 0) setIsDragging(false)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        dragCounter.current = 0

        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter((f) => f.type.startsWith("image/"))
        const zipFiles = files.filter((f) => f.name.endsWith(".zip"))

        if (imageFiles.length > 0) addImages(imageFiles)
        if (zipFiles.length > 0) handleZipSelect(zipFiles[0])
    }

    // Coller une image depuis le presse-papier
    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData?.items
        if (!items) return
        for (const item of items) {
            if (item.type.startsWith("image/")) {
                e.preventDefault()
                const file = item.getAsFile()
                if (file) addImages([file])
                return
            }
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value)
        emitTyping(true)

        if (typingTimeout.current) clearTimeout(typingTimeout.current)
        typingTimeout.current = setTimeout(() => emitTyping(false), 1500)
    }

    const hasAttachments = images.length > 0 || zipFile
    const canSend = input.trim() || hasAttachments

    const getPlaceholder = () => {
        const parts: string[] = []
        if (images.length > 0) parts.push(`${images.length} image(s)`)
        if (zipFile) parts.push('1 fichier zip')
        if (parts.length > 0) return `${parts.join(' + ')} prêt(s)`
        return "Écrire un message..."
    }

    return (
        <div
            ref={dropZoneRef}
            className="px-4 py-3 bg-background border-t border-border relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Overlay drag & drop */}
            {isDragging && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded-lg">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <ImagePlus className="h-5 w-5" />
                        Déposez vos fichiers ici
                    </div>
                </div>
            )}

            {/* Aperçu images + zip */}
            {hasAttachments && (
                <div className="mb-2 flex gap-2 flex-wrap items-end">
                    {images.map((img, i) => (
                        <div key={i} className="relative">
                            <Image
                                src={img.preview}
                                alt={`Aperçu ${i + 1}`}
                                width={80}
                                height={80}
                                className="rounded-lg object-cover border border-border"
                                style={{ width: 80, height: 80 }}
                            />
                            <button
                                type="button"
                                onClick={() => removeImage(i)}
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    ))}

                    {zipFile && (
                        <div className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/50">
                            <FileArchive className="h-5 w-5 text-primary shrink-0" />
                            <div className="min-w-0">
                                <p className="text-xs font-medium truncate max-w-[150px]">{zipFile.name}</p>
                                <p className="text-[10px] text-muted-foreground">{formatFileSize(zipFile.size)}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setZipFile(null)}
                                className="ml-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90 shrink-0"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="flex items-center gap-2 relative">
                {/* Emoji */}
                <button
                    type="button"
                    onClick={() => setShowPicker((prev) => !prev)}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                    <Smile className="h-5 w-5" />
                </button>

                {showPicker && (
                    <div ref={pickerRef}>
                        <CustomEmojiPicker
                            onSelect={(emoji) => {
                                setInput((prev) => prev + emoji)
                                setShowPicker(false)
                            }}
                        />
                    </div>
                )}

                {/* Image */}
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50 group/img relative"
                >
                    <ImagePlus className="h-5 w-5" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[11px] font-medium text-white bg-foreground/90 rounded-md whitespace-nowrap opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none">
                        Images (max 5 Mo)
                    </span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />

                {/* Zip */}
                <button
                    type="button"
                    onClick={() => zipInputRef.current?.click()}
                    disabled={isUploading || !!zipFile}
                    className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50 group/zip relative"
                >
                    <Paperclip className="h-5 w-5" />
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-[11px] font-medium text-white bg-foreground/90 rounded-md whitespace-nowrap opacity-0 group-hover/zip:opacity-100 transition-opacity pointer-events-none">
                        Fichier .zip (max 10 Mo)
                    </span>
                </button>
                <input
                    ref={zipInputRef}
                    type="file"
                    accept={`.zip,${ALLOWED_FILE_TYPES.join(',')}`}
                    onChange={handleZipInputChange}
                    className="hidden"
                />

                {/* Input texte */}
                <input
                    value={input}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            handleSend()
                        }
                    }}
                    onPaste={handlePaste}
                    disabled={isUploading}
                    className="flex-1 bg-muted rounded-full px-4 py-2.5 text-[15px] text-foreground placeholder-muted-foreground outline-none focus:bg-muted/80 transition-colors disabled:opacity-50"
                    placeholder={getPlaceholder()}
                />

                {/* Bouton envoyer */}
                <button
                    onClick={handleSend}
                    disabled={!canSend || isUploading}
                    className="btn-cyber-primary p-2.5 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    {isUploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                        <Send className="h-5 w-5" />
                    )}
                </button>
            </div>
        </div>
    )
}
