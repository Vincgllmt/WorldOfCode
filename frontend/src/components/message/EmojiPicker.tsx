"use client"

import EmojiPicker, { Theme } from 'emoji-picker-react'
import { useTheme } from 'next-themes'

type EmojiPickerProps = {
    onSelect: (emoji: string) => void
}

export default function CustomEmojiPicker({ onSelect }: EmojiPickerProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark' || theme === 'cyberpunk-dark'
    const pickerTheme: Theme = isDark ? Theme.DARK : Theme.LIGHT

    return (
        <div className="absolute bottom-12 right-0 z-50 shadow-lg border rounded-lg bg-popover">
            <EmojiPicker
                onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
                lazyLoadEmojis
                width={300}
                height={400}
                theme={pickerTheme}
            />
        </div>
    )
}
