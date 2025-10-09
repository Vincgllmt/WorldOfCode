"use client"

import EmojiPicker from 'emoji-picker-react';

type EmojiPickerProps = {
    onSelect: (emoji: string) => void
}

export default function CustomEmojiPicker({ onSelect }: EmojiPickerProps) {
    return (
        <div className="absolute bottom-12 right-0 z-50 shadow-lg border rounded bg-white">
            <EmojiPicker
                onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
                lazyLoadEmojis
                width={300}
                height={400}

            />
        </div>
    )
}
