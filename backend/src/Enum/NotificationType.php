<?php

namespace App\Enum;

enum NotificationType: string
{
    case COMMENT = 'comment';
    case FOLLOW = 'follow';
    case LIKE = 'like';

    /**
     * @return array<int, string>
     */
    public static function values(): array
    {
        return array_map(static fn(self $type) => $type->value, self::cases());
    }
}
