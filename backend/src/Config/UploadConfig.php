<?php

namespace App\Config;

class UploadConfig
{
    public const ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
    ];

    private const MIME_TO_LABEL = [
        'image/jpeg'   => 'JPG',
        'image/png'    => 'PNG',
        'image/gif'    => 'GIF',
        'image/webp'   => 'WebP',
        'image/svg+xml' => 'SVG',
    ];

    public const MAX_SIZE_MB = 5;
    public const MAX_SIZE_BYTES = self::MAX_SIZE_MB * 1024 * 1024;

    public static function allowedFormatsLabel(): string
    {
        $labels = array_map(
            fn(string $mime) => self::MIME_TO_LABEL[$mime] ?? $mime,
            self::ALLOWED_MIME_TYPES
        );
        return implode(', ', $labels);
    }
}
