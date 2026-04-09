"use client"

import EmojiPicker, { Theme, Categories } from 'emoji-picker-react'
import { useTheme } from 'next-themes'

type EmojiPickerProps = {
    onSelect: (emoji: string) => void
}

const frenchCategories = [
    { category: Categories.SUGGESTED, name: 'Récents' },
    { category: Categories.SMILEYS_PEOPLE, name: 'Smileys & Personnes' },
    { category: Categories.ANIMALS_NATURE, name: 'Animaux & Nature' },
    { category: Categories.FOOD_DRINK, name: 'Nourriture & Boissons' },
    { category: Categories.TRAVEL_PLACES, name: 'Voyages & Lieux' },
    { category: Categories.ACTIVITIES, name: 'Activités' },
    { category: Categories.OBJECTS, name: 'Objets' },
    { category: Categories.SYMBOLS, name: 'Symboles' },
    { category: Categories.FLAGS, name: 'Drapeaux' },
]

export default function CustomEmojiPicker({ onSelect }: EmojiPickerProps) {
    const { theme } = useTheme()
    const isDark = theme === 'dark' || theme === 'cyberpunk-dark'
    const pickerTheme: Theme = isDark ? Theme.DARK : Theme.LIGHT

    return (
        <div className="absolute bottom-12 left-0 z-50 shadow-lg border rounded-lg bg-popover">
            <EmojiPicker
                onEmojiClick={(emojiData) => onSelect(emojiData.emoji)}
                lazyLoadEmojis
                width={300}
                height={400}
                theme={pickerTheme}
                searchPlaceHolder="Rechercher (en anglais)..."
                previewConfig={{
                    defaultCaption: 'Choisissez un émoji',
                    showPreview: true,
                    defaultEmoji: '1f60a',
                }}
                categories={frenchCategories}
            />
        </div>
    )
}
