<?php

namespace App\Enum;

enum SessionFormat: string
{
    case TEXT = 'text';
    case VIDEO = 'video';
    case HYBRID = 'hybrid';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $type) => $type->value, self::cases());
    }
}
