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

    public const ALLOWED_FILE_MIME_TYPES = [
        'application/zip',
        'application/x-zip-compressed',
    ];

    private const MIME_TO_LABEL = [
        'image/jpeg'                  => 'JPG',
        'image/png'                   => 'PNG',
        'image/gif'                   => 'GIF',
        'image/webp'                  => 'WebP',
        'image/svg+xml'               => 'SVG',
        'application/zip'             => 'ZIP',
        'application/x-zip-compressed' => 'ZIP',
    ];

    public const MAX_SIZE_MB = 5;
    public const MAX_SIZE_BYTES = self::MAX_SIZE_MB * 1024 * 1024;

    public const MAX_FILE_SIZE_MB = 10;
    public const MAX_FILE_SIZE_BYTES = self::MAX_FILE_SIZE_MB * 1024 * 1024;

    public static function isAllowedMime(string $mime): bool
    {
        return in_array($mime, self::ALLOWED_MIME_TYPES, true)
            || in_array($mime, self::ALLOWED_FILE_MIME_TYPES, true);
    }

    public static function maxSizeBytesForMime(string $mime): int
    {
        return in_array($mime, self::ALLOWED_FILE_MIME_TYPES, true)
            ? self::MAX_FILE_SIZE_BYTES
            : self::MAX_SIZE_BYTES;
    }

    public static function maxSizeMbForMime(string $mime): int
    {
        return in_array($mime, self::ALLOWED_FILE_MIME_TYPES, true)
            ? self::MAX_FILE_SIZE_MB
            : self::MAX_SIZE_MB;
    }

    public static function allowedFormatsLabel(): string
    {
        $allMimes = array_merge(self::ALLOWED_MIME_TYPES, self::ALLOWED_FILE_MIME_TYPES);
        $labels = array_unique(array_map(
            fn(string $mime) => self::MIME_TO_LABEL[$mime] ?? $mime,
            $allMimes
        ));
        return implode(', ', $labels);
    }
}
